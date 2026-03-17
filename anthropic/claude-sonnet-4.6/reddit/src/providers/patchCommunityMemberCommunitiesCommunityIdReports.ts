import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportAtSummaryTransformer } from "../transformers/CommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  // 1. Verify community exists and is not soft-deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Verify caller is a moderator or owner of this community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { role: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build WHERE clause
  const whereInput = {
    community_id: props.communityId,
    status: "pending",
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        reason: { contains: props.body.search, mode: "insensitive" as const },
      }),
    ...(props.body.targetType === "post" && { post_id: { not: null } }),
    ...(props.body.targetType === "comment" && { comment_id: { not: null } }),
  } satisfies Prisma.community_reportsWhereInput;
  // 5. Query reports and count
  const data = await MyGlobal.prisma.community_reports.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...CommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_reports.count({
    where: whereInput,
  });
  // 6. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityReportAtSummaryTransformer.transform,
  );
  // 7. Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
