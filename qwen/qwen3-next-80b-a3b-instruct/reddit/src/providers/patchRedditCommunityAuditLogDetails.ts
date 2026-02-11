import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserAuditLogDetailAtSummaryTransformer } from "../transformers/RedditCommunityUserAuditLogDetailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAuditLogDetails(props: {
  body: IRedditCommunityUserAuditLogDetail.IRequest;
}): Promise<IPageIRedditCommunityUserAuditLogDetail.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Convert date inputs to ISO strings using toISOStringSafe
  const createdAtFrom = props.body.created_at_from
    ? toISOStringSafe(props.body.created_at_from)
    : undefined;
  const createdAtTo = props.body.created_at_to
    ? toISOStringSafe(props.body.created_at_to)
    : undefined;
  // Build WHERE clause with conditional filters
  const whereInput: Prisma.reddit_community_user_audit_log_detailsWhereInput =
    {};
  const andConditions: Prisma.reddit_community_user_audit_log_detailsWhereInput[] =
    [];
  if (props.body.key !== undefined) {
    andConditions.push({ key: props.body.key });
  }
  if (props.body.value !== undefined) {
    andConditions.push({ value: props.body.value });
  }
  if (createdAtFrom !== undefined || createdAtTo !== undefined) {
    andConditions.push({
      auditLog: {
        created_at: {
          gte: createdAtFrom,
          lte: createdAtTo,
        },
      },
    });
  }
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.reddit_community_user_audit_log_details.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { auditLog: { created_at: "desc" } },
      ...RedditCommunityUserAuditLogDetailAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.reddit_community_user_audit_log_details.count({
      where: whereInput,
    });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityUserAuditLogDetailAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
