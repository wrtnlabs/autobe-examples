import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get community IDs from moderator's roles
  const moderatorRoles =
    await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
      where: {
        user_id: props.moderator.id,
      },
      select: { community_id: true },
    });
  const communityIds = moderatorRoles.map((role) => role.community_id);
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build where clause
  const where: Prisma.reddit_like_reportsWhereInput = {
    deleted_at: null,
    status: props.body.status ? { equals: props.body.status } : undefined,
    reporter_id: props.body.reporter_id
      ? { equals: props.body.reporter_id }
      : undefined,
    reported_post_id: props.body.reported_post_id
      ? { equals: props.body.reported_post_id }
      : undefined,
    reported_comment_id: props.body.reported_comment_id
      ? { equals: props.body.reported_comment_id }
      : undefined,
    created_at: {
      gte: props.body.created_at_min,
      lte: props.body.created_at_max,
    },
  } satisfies Prisma.reddit_like_reportsWhereInput;
  // Build order by clause
  const orderByInput = (
    props.body.sort === "created_at_desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.reddit_like_reportsOrderByWithRelationInput;
  // Query reports with pagination
  const data = await MyGlobal.prisma.reddit_like_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_reports.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
