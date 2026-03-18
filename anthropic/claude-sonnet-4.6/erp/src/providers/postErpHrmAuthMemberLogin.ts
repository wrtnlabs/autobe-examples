import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmMember.ILogin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Find member by email, excluding deactivated accounts
  const rawMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...ErpHrmMemberTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Reject with generic 401 if not found (no enumeration of registered accounts)
  if (rawMember === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password — same error message as not-found to prevent enumeration
  const isValid = await PasswordUtil.verify(
    props.body.password,
    rawMember.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create a new session record (append-only, logout handled via expired_at)
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: v4(),
      member: { connect: { id: rawMember.id } },
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    select: {
      id: true,
    },
  });
  // 5. Compute expiry timestamps as ISO strings for the token DTO
  const createdAtIso = new Date().toISOString();
  const accessExpiredAtIso = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiredAtIso = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 6. Issue JWT access and refresh tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: rawMember.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: rawMember.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // 7. Destructure password_hash out so transformer receives a clean Payload
  const { password_hash: _discarded, ...memberPayload } = rawMember;
  const member = await ErpHrmMemberTransformer.transform(memberPayload);
  // 8. Return IErpHrmMember.IAuthorized (flat member fields + nested member + token)
  return {
    ...member,
    member,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAtIso,
      refreshable_until: refreshExpiredAtIso,
    } satisfies IAuthorizationToken,
  } satisfies IErpHrmMember.IAuthorized;
}
