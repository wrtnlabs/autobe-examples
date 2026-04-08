import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityBanAtSummaryTransformer } from "../transformers/RedditCloneCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityBan.IRequest;
}): Promise<IPageIRedditCloneCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify moderator has access to this community
  const modAccess =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (modAccess === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build filter conditions from request body
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    ...(props.body.member_id && {
      reddit_clone_member_id: props.body.member_id,
    }),
    ...(props.body.status === "active" && {
      deleted_at: null,
    }),
    ...(props.body.status === "removed" && {
      deleted_at: { not: null },
    }),
    ...(props.body.created_at_gte && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
    ...(props.body.updated_at_gte && {
      updated_at: { gte: new Date(props.body.updated_at_gte) },
    }),
    ...(props.body.updated_at_lte && {
      updated_at: { lte: new Date(props.body.updated_at_lte) },
    }),
    ...(props.body.expires_at_gte && {
      expires_at: { gte: new Date(props.body.expires_at_gte) },
    }),
    ...(props.body.expires_at_lte && {
      expires_at: { lte: new Date(props.body.expires_at_lte) },
    }),
    ...(props.body.search && {
      ban_reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.reddit_clone_community_bansWhereInput;
  // Build sort order from request body
  const orderByInput = (
    props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort === "updated_at"
        ? { updated_at: props.body.order ?? "desc" }
        : props.body.sort === "expires_at"
          ? { expires_at: props.body.order ?? "desc" }
          : props.body.sort === "ban_reason"
            ? { ban_reason: props.body.order ?? "desc" }
            : { created_at: "desc" }
  ) satisfies Prisma.reddit_clone_community_bansOrderByWithRelationInput;
  // Fetch paginated ban records with nested relations
  const records = await MyGlobal.prisma.reddit_clone_community_bans.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCloneCommunityBanAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommunityBanAtSummaryTransformer.transform,
    ),
  };
}
