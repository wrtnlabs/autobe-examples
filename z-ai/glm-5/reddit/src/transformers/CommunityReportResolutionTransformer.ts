import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityReportAtSummaryTransformer } from "./CommunityReportAtSummaryTransformer";

export namespace CommunityReportResolutionTransformer {
  export type Payload = Prisma.community_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        notes: true,
        created_at: true,
        moderator: CommunityMemberAtSummaryTransformer.select(),
        report: CommunityReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityReportResolution> {
    return {
      id: input.id,
      action: input.action as "APPROVE" | "DISMISS",
      notes: input.notes,
      created_at: input.created_at.toISOString(),
      moderator: await CommunityMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
      report: await CommunityReportAtSummaryTransformer.transform(input.report),
    };
  }
}
