import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsMemberTransformer } from "../transformers/HrmsMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsAuthMemberLogin(props: {
  ip: string;
  body: IHrmsMember.ILogin;
}): Promise<IHrmsMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...HrmsMemberTransformer.select().select,
      password_hash: true,
      deleted_at: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid: boolean = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check account is active
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deactivated", 401);
  }
  // 4. Invalidate existing sessions
  await MyGlobal.prisma.hrms_member_sessions.deleteMany({
    where: { member: { id: member.id } },
  });
  // 5. Create new session
  const session = await MyGlobal.prisma.hrms_member_sessions.create({
    data: {
      id: v4(),
      member: { connect: { id: member.id } },
      ip: props.ip,
      href: "",
      referrer: "",
      user_agent: "",
      access_token: "",
      refresh_token: "",
      created_at: new Date(),
      expired_at: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  // 6. Generate JWT tokens
  const currentTime: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: currentTime,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: currentTime,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Update session with tokens
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // 8. Return IAuthorized
  return {
    ...(await HrmsMemberTransformer.transform(member)),
    token,
  } satisfies IHrmsMember.IAuthorized;
}
