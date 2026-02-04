import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";

export namespace CommunityPlatformCommentReportTransformer {
  export type Payload = Prisma.community_platform_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reporter: true,
        reportedComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        created_at: true,
        reason: true,
        status: true,
      },
    } satisfies Prisma.community_platform_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentReport> {
    return {
      comment_id: input.reportedComment.id,
      reporter: input.reporter ? {} : null,
      reportedComment:
        await CommunityPlatformCommentAtSummaryTransformer.transform(
          input.reportedComment,
        ),
      id: input.id,
    };
  }
}
