import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunitySlugBansBanId(props: {
  admin: AdminPayload;
  communitySlug: string &
    tags.Format<"uri"> &
    tags.ContentMediaType<"text/plain"> &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IUpdate;
}): Promise<ICommunityPlatformCommunityBan> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        slug: props.communitySlug,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        owner: {
          select: {
            community_platform_community_moderator_id: true,
          },
        },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.community_platform_community_bans.findFirstOrThrow({
      where: {
        id: props.banId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_community_id: true,
        reason: true,
        status: true,
        started_at: true,
        expired_at: true,
        lifted_at: true,
      },
    });
  if (existing.community_platform_community_id !== community.id) {
    throw new HttpException("Not Found", 404);
  }
  const nextStatus = props.body.status ?? existing.status;
  const nextExpiredAt =
    props.body.expired_at !== undefined
      ? props.body.expired_at
      : (existing.expired_at?.toISOString() ?? null);
  const nextLiftedAt =
    props.body.lifted_at !== undefined
      ? props.body.lifted_at
      : (existing.lifted_at?.toISOString() ?? null);
  const startedAt = existing.started_at.toISOString();
  if (nextStatus === "lifted" && nextLiftedAt === null) {
    throw new HttpException("Lifted bans require lifted_at", 400);
  }
  if (nextStatus === "active" && nextLiftedAt !== null) {
    throw new HttpException("Active bans cannot have lifted_at", 400);
  }
  if (nextExpiredAt !== null && nextExpiredAt < startedAt) {
    throw new HttpException(
      "expired_at cannot be earlier than started_at",
      400,
    );
  }
  if (nextLiftedAt !== null && nextLiftedAt < startedAt) {
    throw new HttpException("lifted_at cannot be earlier than started_at", 400);
  }
  const updatedAt = toISOStringSafe(new Date());
  const output = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_community_bans.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.expired_at !== undefined && {
          expired_at: props.body.expired_at,
        }),
        ...(props.body.lifted_at !== undefined && {
          lifted_at: props.body.lifted_at,
        }),
        updated_at: updatedAt,
      },
    });
    return tx.community_platform_community_bans.findUniqueOrThrow({
      where: {
        id: existing.id,
      },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  });
  return await CommunityPlatformCommunityBanTransformer.transform(output);
}
