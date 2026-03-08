import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentTransformer } from "./CommunityPlatformCommentTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostTransformer } from "./CommunityPlatformPostTransformer";

export namespace CommunityPlatformReportTransformer {
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
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
        postReport: {
          select: {
            post: CommunityPlatformPostTransformer.select(),
          },
        } satisfies Prisma.community_platform_report_postsFindManyArgs,
        commentTarget: {
          select: {
            comment: CommunityPlatformCommentTransformer.select(),
          },
        } satisfies Prisma.community_platform_report_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport> {
    const content_type: "post" | "comment" = input.postReport
      ? "post"
      : "comment";
    const content = input.postReport
      ? await CommunityPlatformPostTransformer.transform(input.postReport.post)
      : await CommunityPlatformCommentTransformer.transform(
          input.commentTarget!.comment,
        );
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      content,
      content_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
