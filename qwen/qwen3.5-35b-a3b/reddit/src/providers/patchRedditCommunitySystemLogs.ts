import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemLog";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemLogAtSummaryTransformer } from "../transformers/RedditCommunitySystemLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunitySystemLogs(props: {
  body: IRedditCommunitySystemLog.IRequest;
}): Promise<IPageIRedditCommunitySystemLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_community_system_logsWhereInput = {
    deleted_at: props.body.exclude_deleted === false ? undefined : null,
  };
  if (props.body.activity_type) {
    whereConditions.activity_type = props.body.activity_type;
  }
  if (props.body.action_performed) {
    whereConditions.action_performed = props.body.action_performed;
  }
  if (props.body.target_type) {
    whereConditions.target_type = props.body.target_type;
  }
  if (props.body.actor_id) {
    whereConditions.actor_id = props.body.actor_id;
  }
  if (props.body.target_post_id) {
    whereConditions.target_post_id = props.body.target_post_id;
  }
  if (props.body.target_comment_id) {
    whereConditions.target_comment_id = props.body.target_comment_id;
  }
  if (props.body.target_community_id) {
    whereConditions.target_community_id = props.body.target_community_id;
  }
  if (props.body.target_report_id) {
    whereConditions.target_report_id = props.body.target_report_id;
  }
  if (props.body.created_at_start && props.body.created_at_end) {
    whereConditions.created_at = {
      gte: new Date(props.body.created_at_start),
      lte: new Date(props.body.created_at_end),
    };
  } else if (props.body.created_at_start) {
    whereConditions.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  } else if (props.body.created_at_end) {
    whereConditions.created_at = {
      lte: new Date(props.body.created_at_end),
    };
  }
  const orderBy: Prisma.reddit_community_system_logsOrderByWithRelationInput =
    props.body.order === "asc" ? { created_at: "asc" } : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_logs.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      ...RedditCommunitySystemLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_system_logs.count({
      where: whereConditions,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunitySystemLogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunitySystemLog.ISummary;
}
