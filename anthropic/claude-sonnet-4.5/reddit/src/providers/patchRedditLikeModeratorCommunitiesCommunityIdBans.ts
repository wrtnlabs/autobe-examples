import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditLikeModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityBan.IRequest;
}): Promise<IPageIRedditLikeCommunityBan> {
  const { moderator, communityId, body } = props;

  // Verify moderator has access to this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause based on filters
  const [bans, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_community_bans.findMany({
      where: {
        community_id: communityId,
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.is_permanent !== undefined && {
          is_permanent: body.is_permanent,
        }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_community_bans.count({
      where: {
        community_id: communityId,
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.is_permanent !== undefined && {
          is_permanent: body.is_permanent,
        }),
      },
    }),
  ]);

  // Transform to DTO format
  const data: IRedditLikeCommunityBan[] = bans.map((ban) => ({
    id: ban.id as string & tags.Format<"uuid">,
    banned_member_id: ban.banned_member_id as string & tags.Format<"uuid">,
    community_id: ban.community_id as string & tags.Format<"uuid">,
    ban_reason_category: ban.ban_reason_category,
    ban_reason_text: ban.ban_reason_text,
    is_permanent: ban.is_permanent,
    expiration_date: ban.expiration_date
      ? toISOStringSafe(ban.expiration_date)
      : undefined,
    is_active: ban.is_active,
    created_at: toISOStringSafe(ban.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
