import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostVoteOfModerator.IRequest;
}): Promise<IPageICommunityPlatformPostVoteOfModerator.ISummary> {
  // Implement pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build Prisma where condition with string date-time filters
  const createdAtFilters: Record<string, unknown> = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    createdAtFilters["gte"] = props.body.createdAtFrom;
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    createdAtFilters["lte"] = props.body.createdAtTo;
  }
  const where: Prisma.community_platform_post_vote_of_moderatorsWhereInput = {
    deleted_at: null,
    ...(props.body.moderatorId !== undefined && {
      community_platform_moderator_id: props.body.moderatorId,
    }),
    ...(props.body.postId !== undefined && {
      community_platform_post_vote_id: props.body.postId,
    }),
    ...(props.body.voteType !== undefined &&
      props.body.voteType !== null && { vote_type: props.body.voteType }),
    ...(Object.keys(createdAtFilters).length > 0 && {
      created_at: createdAtFilters,
    }),
  };
  // Query total count
  const total =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.count({
      where,
    });
  // Query paginated records
  const records =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Map database records to response DTO without using as assertions
  const data = records.map((r) => ({
    id: r.id,
    communityPlatformModeratorId: r.community_platform_moderator_id,
    communityPlatformPostVoteId: r.community_platform_post_vote_id,
    voteType: r.vote_type,
    createdAt: r.created_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    updatedAt: r.updated_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    deletedAt:
      r.deleted_at === null
        ? null
        : (r.deleted_at.toISOString() as unknown as
            | (string & tags.Format<"date-time">)
            | null),
  }));
  // Return paginated results with proper pagination metadata
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
