import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  // 1. Verify moderator status
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // 3. Build WHERE clause
  // Default to 'pending' status if not specified (per specification)
  const status: string = props.body.status ?? "pending";
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    status: status,
    ...(props.body.target_type !== undefined &&
      props.body.target_type !== null && {
        target_type: props.body.target_type,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        reason: { contains: props.body.search },
      }),
  } satisfies Prisma.community_platform_reportsWhereInput;
  // 4. Query reports with pagination
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  // 5. Get total count
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereInput,
  });
  // 6. Transform results
  const data = await ArrayUtil.asyncMap(
    reports,
    CommunityPlatformReportAtSummaryTransformer.transform,
  );
  // 7. Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
