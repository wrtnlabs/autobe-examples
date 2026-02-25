import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformReportReasonAtSummaryTransformer } from "./CommunityPlatformReportReasonAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommentReportAtSummaryTransformer {
  export type Payload = Prisma.community_platform_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
        reporterUser: CommunityPlatformUserAtSummaryTransformer.select(),
        reportReason:
          CommunityPlatformReportReasonAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentReport.ISummary> {
    return {
      id: input.id,
      status: input.status,
      description: input.description ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      comment: await CommunityPlatformCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      reporterUser: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.reporterUser,
      ),
      reportReason: input.reportReason
        ? await CommunityPlatformReportReasonAtSummaryTransformer.transform(
            input.reportReason,
          )
        : null,
    };
  }
}
