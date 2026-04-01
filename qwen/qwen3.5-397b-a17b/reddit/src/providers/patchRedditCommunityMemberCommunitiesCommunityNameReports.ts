import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentReportAtSummaryTransformer } from "../transformers/RedditCommunityCommentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  await MyGlobal.prisma.reddit_community_moderators.findFirstOrThrow({
    where: {
      community_id: community.id,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.reddit_community_comment_reportsWhereInput = {
    deleted_at: null,
    comment: {
      post: {
        reddit_community_community_id: community.id,
        deleted_at: null,
      },
    },
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.reddit_community_comment_reportsWhereInput;
  const orderByInput: Prisma.reddit_community_comment_reportsOrderByWithRelationInput =
    props.body.sort !== undefined
      ? (() => {
          const [field, direction] = props.body.sort.split(":") as [
            string,
            "asc" | "desc",
          ];
          if (field === "created_at") {
            return { created_at: direction };
          } else if (field === "status") {
            return { status: direction };
          }
          return { created_at: "desc" as const };
        })()
      : { created_at: "desc" as const };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityCommentReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_comment_reports.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
