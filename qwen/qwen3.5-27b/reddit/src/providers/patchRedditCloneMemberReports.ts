import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportAtSummaryTransformer } from "../transformers/RedditCloneReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberReports(props: {
  member: MemberPayload;
  body: IRedditCloneReport.IRequest;
}): Promise<IPageIRedditCloneReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    reddit_clone_member_id: props.member.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.community_id && {
      reddit_clone_community_id: props.body.community_id,
    }),
    ...(props.body.content_type && { content_type: props.body.content_type }),
  } satisfies Prisma.reddit_clone_reportsWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
