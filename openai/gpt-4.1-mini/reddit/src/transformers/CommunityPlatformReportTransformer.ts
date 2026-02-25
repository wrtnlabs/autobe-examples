import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformReportReasonAtSummaryTransformer } from "./CommunityPlatformReportReasonAtSummaryTransformer";
import { CommunityPlatformReportedContentTransformer } from "./CommunityPlatformReportedContentTransformer";
import { CommunityPlatformReportsDecisionTransformer } from "./CommunityPlatformReportsDecisionTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformReportTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        reportReason:
          CommunityPlatformReportReasonAtSummaryTransformer.select(),
        reportedContents: CommunityPlatformReportedContentTransformer.select(),
        decisions: CommunityPlatformReportsDecisionTransformer.select(),
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport> {
    return {
      id: input.id,
      description: input.description,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      communityPlatformUserId: input.user.id,
      communityPlatformReportReasonId: input.reportReason.id,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      reportReason:
        await CommunityPlatformReportReasonAtSummaryTransformer.transform(
          input.reportReason,
        ),
      reportedContents: await ArrayUtil.asyncMap(
        input.reportedContents,
        CommunityPlatformReportedContentTransformer.transform,
      ),
      decisions: await ArrayUtil.asyncMap(
        input.decisions,
        CommunityPlatformReportsDecisionTransformer.transform,
      ),
    };
  }
}
