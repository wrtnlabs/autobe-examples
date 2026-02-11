import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityReport> {
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          title: true,
          type: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              created_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              owner: {
                select: {
                  id: true,
                  display_name: true,
                  avatar_url: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              deleted_at: true,
            },
          },
          comments_count: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          author: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              created_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          voteCount: true,
        },
      },
      reporter: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  return {
    id: report.id,
    reason: report.reason,
    status: report.status as "pending" | "approved" | "dismissed",
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    post: report.post
      ? await CommunityPostAtSummaryTransformer.transform(report.post)
      : null,
    comment: report.comment
      ? await CommunityCommentAtSummaryTransformer.transform(report.comment)
      : null,
    reporter: await CommunityMemberAtSummaryTransformer.transform(
      report.reporter,
    ),
  } as ICommunityReport;
}
