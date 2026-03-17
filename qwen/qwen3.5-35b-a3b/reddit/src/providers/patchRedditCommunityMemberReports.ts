import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  // Step 1: Get moderator communities
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    });
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_community_moderators.findMany({
      where: { reddit_community_moderator_id: member.id, deleted_at: null },
      select: { reddit_community_community_id: true },
    });
  const communityIds = moderatorCommunities.map(
    (m) => m.reddit_community_community_id,
  );
  // Step 2: Build WHERE clause
  const reasonWhereInput: Prisma.StringFilter | undefined =
    props.body.reason_search !== undefined
      ? {
          contains: props.body.reason_search,
          mode: "insensitive",
        }
      : undefined;
  const reporterWhereInput:
    | {
        username?: Prisma.StringFilter;
      }
    | undefined =
    props.body.reporter_username !== undefined
      ? {
          username: {
            contains: props.body.reporter_username,
            mode: "insensitive",
          },
        }
      : undefined;
  const searchTextInput: Prisma.reddit_community_reportsWhereInput | undefined =
    props.body.searchText !== undefined
      ? {
          OR: [
            {
              reason: {
                contains: props.body.searchText,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined;
  const createdAtGteInput: Prisma.DateTimeFilter | undefined =
    props.body.createdAtGte !== undefined
      ? {
          gte: new Date(props.body.createdAtGte),
        }
      : undefined;
  const createdAtLteInput: Prisma.DateTimeFilter | undefined =
    props.body.createdAtLte !== undefined
      ? {
          lte: new Date(props.body.createdAtLte),
        }
      : undefined;
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    community_id: {
      in:
        communityIds.length > 0
          ? communityIds
          : ["00000000-0000-0000-0000-000000000000"],
    },
    status: props.body.status,
    target_type: props.body.target_type,
    reporter: reporterWhereInput,
    reason: reasonWhereInput,
    ...searchTextInput,
    created_at: {
      ...createdAtGteInput,
      ...createdAtLteInput,
    },
  };
  // Step 3: Handle sorting
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput[] =
    props.body.sortBy === "status"
      ? [{ status: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
      : props.body.sortBy === "createdAt"
        ? [{ created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
        : [{ created_at: "desc" }];
  // Step 4: Handle pagination
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? props.body.limit ?? 50;
  let data: Prisma.reddit_community_reportsGetPayload<
    ReturnType<typeof RedditCommunityReportAtSummaryTransformer.select>
  >[];
  let total: number;
  if (props.body.cursor !== undefined) {
    // Cursor-based pagination
    const cursorRecord =
      await MyGlobal.prisma.reddit_community_reports.findFirst({
        where: { id: props.body.cursor, deleted_at: null },
        orderBy: { created_at: "desc" },
        select: { id: true, created_at: true, status: true, reporter_id: true },
      });
    if (!cursorRecord) {
      throw new HttpException("Invalid cursor", 400);
    }
    const cursorWhereInput: Prisma.reddit_community_reportsWhereInput = {
      ...whereInput,
      AND: [
        { created_at: { lt: cursorRecord.created_at } },
        {
          OR: [
            { created_at: { lt: cursorRecord.created_at } },
            {
              created_at: cursorRecord.created_at,
              id: {
                lt: cursorRecord.id,
              },
            },
          ],
        },
      ],
    };
    data = await MyGlobal.prisma.reddit_community_reports.findMany({
      where: cursorWhereInput,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_community_reports.count({
      where: cursorWhereInput,
    });
  } else if (props.body.page !== undefined) {
    // Offset-based pagination
    const skip = (page - 1) * limit;
    data = await MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_community_reports.count({
      where: whereInput,
    });
  } else {
    // Default: first page
    data = await MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_community_reports.count({
      where: whereInput,
    });
  }
  // Step 5: Transform and return
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
