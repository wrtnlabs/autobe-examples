import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityModerationActionOfPostAtSummaryTransformer } from "../transformers/RedditCommunityModerationActionOfPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminModerationActions(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityModerationActionOfPost.IRequest;
}): Promise<IPageIRedditCommunityModerationActionOfPost.ISummary> {
  const limit = props.body.limit;
  const cursor = props.body.cursor;
  // Filter only 'post' targets as per transformer's expectation
  const whereInput = {
    target_type: "post",
    action_type: props.body.action_type ?? undefined,
    actor_id: props.body.actor_id ?? undefined,
    created_at: {
      gte: props.body.created_at_after ?? undefined,
      lte: props.body.created_at_before ?? undefined,
    },
  } satisfies Prisma.reddit_community_moderation_actionsWhereInput;
  // Fetch complete payload with relations exactly as defined by transformer
  const data =
    await MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      take: limit + 1,
      ...RedditCommunityModerationActionOfPostAtSummaryTransformer.select(),
    });
  // Determine next cursor
  const nextCursor = data.length > limit ? data[limit].id : null;
  const trimmedData = data.slice(0, limit);
  // Transform to DTO using the transformer - pass raw Prisma data
  const transformed = await ArrayUtil.asyncMap(
    trimmedData,
    RedditCommunityModerationActionOfPostAtSummaryTransformer.transform,
  );
  // Count total matching records
  const totalCount =
    await MyGlobal.prisma.reddit_community_moderation_actions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: 0, // cursor-based pagination doesn't use 1-indexed page
      limit,
      records: totalCount,
      pages: 0, // Omit pages for cursor-based pagination; clients should use nextCursor
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
