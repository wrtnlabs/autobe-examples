import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

export async function postCommunityPlatformAuthOwnerJoin(props: {
  body: ICommunityPlatformOwner.IJoin;
}): Promise<ICommunityPlatformOwner.IAuthorized> {
  // Extract email and password from props
  const { email, password } = props.body;
  // Check for existing owner (security: generic response)
  const existingOwner =
    await MyGlobal.prisma.community_platform_owners.findFirst({
      where: {
        email: email,
      },
    });
  // Generate username from email if not provided - but do not use username property from IJoin
  const username = email.split("@")[0] || "owner_" + v4().substring(0, 8);
  // Hash password using PasswordUtil (secure hashing)
  const passwordHash = await PasswordUtil.hash(password);
  // Create owner record
  const owner = await MyGlobal.prisma.community_platform_owners.create({
    data: {
      email: email,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()),
      // Add all required fields from community_platform_ownersCreateInput
      id: v4() as string & tags.Format<"uuid">,
      display_name: username,
      karma: 0,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  // Generate 32-character email verification token (secure random)
  const verificationToken = (
    v4().replaceAll("-", "").substring(0, 8) +
    v4().replaceAll("-", "").substring(0, 8) +
    v4().replaceAll("-", "").substring(0, 8) +
    v4().replaceAll("-", "").substring(0, 8)
  ).substring(0, 32);
  // Create email verification record with 48-hour expiration
  const expiresAt = toISOStringSafe(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const emailVerification =
    await MyGlobal.prisma.community_platform_owner_email_verifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">, // Add required id field
        is_used: false, // Add required is_used field
        token: verificationToken,
        owner: { connect: { id: owner.id } }, // Correct relation syntax for Prisma nested create
        expires_at: expiresAt,
        created_at: toISOStringSafe(new Date()),
      },
    });
  // Generate JWT access token with 7-day expiration
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "owner",
      id: owner.id,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Generate JWT refresh token with 14-day expiration
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );
  const refreshToken = jwt.sign(
    {
      type: "owner",
      id: owner.id,
      session_id: v4() as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "14d",
      issuer: "autobe",
    },
  );
  // Return authorized response with token structure
  return {
    id: owner.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityPlatformOwner.IAuthorized;
}
