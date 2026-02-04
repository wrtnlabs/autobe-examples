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

export async function postCommunityPlatformAuthOwnerLogin(props: {
  body: ICommunityPlatformOwner.ILogin;
}): Promise<ICommunityPlatformOwner.IAuthorized> {
  // Find owner by email
  const owner = await MyGlobal.prisma.community_platform_owners.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      password_hash: true, // Fixed: password_hashed -> password_hash
      // status: true, // Removed: status not in schema
    },
  });
  if (!owner) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Verify password (status check removed as no status field)
  const isValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Create new session - Added required fields ip and href
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.community_platform_owner_sessions.create({
      data: {
        id: v4(),
        owner_id: owner.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
        ip: "0.0.0.0", // Added required field
        href: "", // Added required field
      },
    });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "owner",
      id: owner.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "owner",
      id: owner.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "14d",
      issuer: "autobe",
    },
  );
  // Return authorized response
  return {
    id: owner.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityPlatformOwner.IAuthorized;
}
