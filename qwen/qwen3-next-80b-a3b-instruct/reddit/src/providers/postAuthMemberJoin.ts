import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { email, username, password } = props.body;

  // Generate new UUID for member ID
  const id: string & tags.Format<"uuid"> = v4();

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(password);

  // Get current time as ISO string (used for creation and expiration calculations)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create member record in database
  const createdMember = await MyGlobal.prisma.community_platform_member.create({
    data: {
      id,
      email,
      username,
      password_hash: hashedPassword,
      is_verified: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      karma: 0,
    },
  });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      userId: createdMember.id,
      email: createdMember.email,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      userId: createdMember.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Build token object with correct structure using now as base for time calculations
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(Date.now() + 3600000)), // 1 hour from now
    refreshable_until: toISOStringSafe(new Date(Date.now() + 604800000)), // 7 days from now
  };

  // Return the authorized response
  return {
    id: createdMember.id,
    token,
  };
}
