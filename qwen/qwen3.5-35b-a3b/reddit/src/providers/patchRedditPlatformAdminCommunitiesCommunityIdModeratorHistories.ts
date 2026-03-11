import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModeratorHistory";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModeratorHistoryAtSummaryTransformer } from "../transformers/RedditPlatformModeratorHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminCommunitiesCommunityIdModeratorHistories(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformModeratorHistory.IRequest;
}): Promise<IPageIRedditPlatformModeratorHistory.ISummary> {
  const page = Number(props.body.page ?? 1) satisfies number as number;
  const limit = Number(props.body.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereInput: Prisma.reddit_platform_moderator_historiesWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  // Apply action_type filter
  if (props.body.action_type !== undefined) {
    whereInput.action_type = props.body.action_type;
  }
  // Apply user_id filter (moderator user)
  if (props.body.user_id !== undefined) {
    whereInput.user_id = props.body.user_id;
  }
  // Apply performed_by_user_id filter
  if (props.body.performed_by_user_id !== undefined) {
    whereInput.acted_by_id = props.body.performed_by_user_id;
  }
  // Apply date range filters
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    if (
      (whereInput.created_at as
        | Prisma.DateTimeFilter<"reddit_platform_moderator_histories">
        | undefined) === undefined
    ) {
      whereInput.created_at = {
        lte: new Date(props.body.created_at_to),
      };
    } else {
      const created_at =
        whereInput.created_at as Prisma.DateTimeFilter<"reddit_platform_moderator_histories">;
      const gteValue =
        typeof created_at.gte === "string"
          ? new Date(created_at.gte)
          : created_at.gte;
      whereInput.created_at = {
        gte: gteValue,
        lte: new Date(props.body.created_at_to),
      };
    }
  }
  // Build ORDER BY clause - default to created_at descending
  const sortOrder = props.body.order ?? ("desc" as "asc" | "desc");
  const defaultSortOrder = "desc" as "asc" | "desc";
  const orderByInput = {
    created_at: props.body.sort === "created_at" ? sortOrder : defaultSortOrder,
  } satisfies Prisma.reddit_platform_moderator_historiesOrderByWithRelationInput;
  // Query records
  const records =
    await MyGlobal.prisma.reddit_platform_moderator_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformModeratorHistoryAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_moderator_histories.count(
    {
      where: whereInput,
    },
  );
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformModeratorHistoryAtSummaryTransformer.transform,
  );
  const totalRecords = Number(total);
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  const currentPage = page satisfies number as number;
  const currentLimit = limit satisfies number as number;
  const currentPageCount = totalRecords satisfies number as number;
  const currentPagePages = totalPages satisfies number as number;
  return {
    data,
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: currentPageCount,
      pages: currentPagePages,
    } satisfies IPage.IPagination,
  };
}
