import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const duplicated = await MyGlobal.prisma.community_platform_members.findFirst(
    {
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
      select: { id: true },
    },
  );
  if (duplicated !== null) throw new HttpException("Conflict", 409);
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const memberId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const member = await MyGlobal.prisma.$transaction(async (prisma) => {
    const createdMember = await prisma.community_platform_members.create({
      data: {
        id: memberId,
        email: props.body.email,
        username: props.body.username,
        password_hash: await PasswordUtil.hash(props.body.password),
        display_name: props.body.displayName,
        bio: props.body.bio ?? null,
        avatar_image_uri: props.body.avatarImageUri ?? null,
        karma: 0,
        created_at: new Date(createdAt),
        updated_at: new Date(createdAt),
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_image_uri: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    await prisma.community_platform_member_sessions.create({
      data: {
        id: sessionId,
        community_platform_member_id: createdMember.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(createdAt),
        expired_at: new Date(refreshExpiredAt),
      },
    });
    return createdMember;
  });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarImageUri: member.avatar_image_uri,
    karma: member.karma,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt:
      member.deleted_at === null ? null : member.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          created_at: createdAt,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
