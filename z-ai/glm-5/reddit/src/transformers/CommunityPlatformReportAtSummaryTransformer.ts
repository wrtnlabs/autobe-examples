import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        postReport: {
          select: {
            community_platform_post_id: true,
            post: {
              select: {
                title: true,
              },
            } satisfies Prisma.community_platform_postsFindManyArgs,
          },
        } satisfies Prisma.community_platform_report_postsFindManyArgs,
        commentTarget: {
          select: {
            comment_id: true,
            comment: {
              select: {
                content: true,
              },
            } satisfies Prisma.community_platform_commentsFindManyArgs,
          },
        } satisfies Prisma.community_platform_report_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport.ISummary> {
    return {
      id: input.id,
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      contentType: input.postReport
        ? "post"
        : input.commentTarget
          ? "comment"
          : "post",
      postId: input.postReport?.community_platform_post_id ?? null,
      commentId: input.commentTarget?.comment_id ?? null,
      contentPreview:
        input.postReport?.post.title ??
        input.commentTarget?.comment.content.substring(0, 200) ??
        null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
