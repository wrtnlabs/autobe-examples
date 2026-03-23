import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerMemberTransformer } from "../transformers/HrmTrackerMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerAuthMemberLogin(props: {
  ip: string;
  body: IHrmTrackerMember.ILogin;
}): Promise<IHrmTrackerMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrm_tracker_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      phone: true,
      status: true,
      email_verified: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.status !== "active") {
    throw new HttpException("Account is not active", 401);
  }
  if (!member.email_verified) {
    throw new HttpException("Email not verified", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_tracker_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: member.id,
      access_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: "", // placeholder, will be replaced
          created_at: toISOStringSafe(now),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: "", // placeholder, will be replaced
          tokenType: "refresh",
          created_at: toISOStringSafe(now),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      ip: props.ip,
      user_agent: "",
      created_at: toISOStringSafe(now),
      expires_at: toISOStringSafe(accessExpires),
      revoked_at: null,
      last_activity_at: toISOStringSafe(now),
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      created_at: true,
      expires_at: true,
      revoked_at: true,
      last_activity_at: true,
    },
  });
  // Replace session_id in tokens
  const accessPayload = jwt.decode(session.access_token) as {
    session_id: string;
  };
  const refreshPayload = jwt.decode(session.refresh_token) as {
    session_id: string;
  };
  if (!accessPayload || !refreshPayload) {
    throw new HttpException("Failed to decode token", 500);
  }
  const updatedAccess = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const updatedRefresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_tracker_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: updatedAccess,
      refresh_token: updatedRefresh,
    },
  });
  const memberData = await HrmTrackerMemberTransformer.transform(member);
  return {
    ...memberData,
    avatar_url: memberData.avatar_url ?? null,
    phone: memberData.phone ?? null,
    token: {
      access: updatedAccess,
      refresh: updatedRefresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
