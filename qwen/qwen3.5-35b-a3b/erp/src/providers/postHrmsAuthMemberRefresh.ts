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

export async function postHrmsAuthMemberRefresh(props: {
  body: IHrmsMember.IRefresh;
}): Promise<IHrmsMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    const verifiedPayload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof verifiedPayload !== "object" ||
      verifiedPayload === null ||
      !("id" in verifiedPayload) ||
      !("session_id" in verifiedPayload) ||
      !("type" in verifiedPayload)
    ) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    decoded = verifiedPayload as {
      id: string;
      session_id: string;
      type: "member";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and not expired
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrms_member_id: decoded.id,
    },
  });
  if (!session || new Date(session.expired_at) <= new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member not deleted
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Verify refresh token matches database
  if (session.refresh_token !== props.body.refresh_token) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // 6. Calculate new expiration times
  const accessExpiresTime = Date.now() + 15 * 60 * 1000;
  const refreshExpiresTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresTime),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresTime),
  );
  // 7. Generate new tokens (SAME session_id)
  const newAccessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens and extended expiration
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpiresTime),
    },
  } satisfies Prisma.hrms_member_sessionsUpdateArgs);
  // 9. Fetch member data with organization memberships
  const memberPayload = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: decoded.id },
    ...HrmsMemberTransformer.select(),
  });
  // 10. Transform and return authorized state
  const transformedMember =
    await HrmsMemberTransformer.transform(memberPayload);
  return {
    id: transformedMember.id,
    email: transformedMember.email,
    display_name: transformedMember.display_name,
    avatar_uri: transformedMember.avatar_uri,
    phone_number: transformedMember.phone_number,
    created_at: transformedMember.created_at,
    updated_at: transformedMember.updated_at,
    deleted_at: transformedMember.deleted_at,
    organization_memberships: transformedMember.organization_memberships,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IHrmsMember.IAuthorized;
}
