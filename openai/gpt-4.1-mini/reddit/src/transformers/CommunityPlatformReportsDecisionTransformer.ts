import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityModeratorTransformer } from "./CommunityPlatformCommunityModeratorTransformer";
import { CommunityPlatformReportAtSummaryTransformer } from "./CommunityPlatformReportAtSummaryTransformer";

export namespace CommunityPlatformReportsDecisionTransformer {
  export type Payload = Prisma.community_platform_reports_decisionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_id: true,
        moderator_id: true,
        report: CommunityPlatformReportAtSummaryTransformer.select(),
        moderator: CommunityPlatformCommunityModeratorTransformer.select(),
        decision: true,
        comments: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_reports_decisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportsDecision> {
    return {
      id: input.id,
      report_id: input.report_id,
      report: await CommunityPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
      moderator_id: input.moderator_id,
      moderator: await CommunityPlatformCommunityModeratorTransformer.transform(
        input.moderator,
      ),
      decision: input.decision as "approved" | "dismissed",
      comments: input.comments,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
