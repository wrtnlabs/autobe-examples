import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserEmailVerifications(props: {
  user: UserPayload;
  body: ICommunityPlatformUserEmailVerification.IRequest;
}): Promise<IPageICommunityPlatformUserEmailVerification.ISummary> {
  const {
    userId,
    token,
    isVerified,
    expiresAtBefore,
    expiresAtAfter,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    page = 1,
    limit = 20,
  } = props.body;
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const normalizedPage = Math.max(page, 1);
  const where: Prisma.community_platform_user_email_verificationsWhereInput = {
    deleted_at: null,
    ...(userId ? { user_id: userId } : {}),
    ...(token ? { token } : {}),
    ...(typeof isVerified === "boolean" ? { is_verified: isVerified } : {}),
    ...(expiresAtBefore
      ? { expires_at: { lt: new Date(expiresAtBefore) } }
      : {}),
    ...(expiresAtAfter ? { expires_at: { gt: new Date(expiresAtAfter) } } : {}),
    ...(createdAtBefore
      ? { created_at: { lt: new Date(createdAtBefore) } }
      : {}),
    ...(createdAtAfter ? { created_at: { gt: new Date(createdAtAfter) } } : {}),
    ...(updatedAtBefore
      ? { updated_at: { lt: new Date(updatedAtBefore) } }
      : {}),
    ...(updatedAtAfter ? { updated_at: { gt: new Date(updatedAtAfter) } } : {}),
  };
  const skip = (normalizedPage - 1) * normalizedLimit;
  const total =
    await MyGlobal.prisma.community_platform_user_email_verifications.count({
      where,
    });
  const records =
    await MyGlobal.prisma.community_platform_user_email_verifications.findMany({
      where,
      skip,
      take: normalizedLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        token: true,
        is_verified: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    pagination: {
      current: normalizedPage,
      limit: normalizedLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
    },
    data: records.map((record) => ({
      id: record.id,
      token: record.token,
      isVerified: record.is_verified,
      expiresAt: toISOStringSafe(record.expires_at),
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
      user: {
        id: record.user.id,
        email: record.user.email,
        username: record.user.username,
        displayName: record.user.display_name,
        bio: record.user.bio === null ? undefined : record.user.bio,
        avatarUrl:
          record.user.avatar_url === null ? undefined : record.user.avatar_url,
        karma: record.user.karma,
        createdAt: toISOStringSafe(record.user.created_at),
        updatedAt: toISOStringSafe(record.user.updated_at),
        deletedAt:
          record.user.deleted_at === null
            ? null
            : toISOStringSafe(record.user.deleted_at),
      } satisfies ICommunityPlatformUser.ISummary,
    })),
  } satisfies IPageICommunityPlatformUserEmailVerification.ISummary;
}
