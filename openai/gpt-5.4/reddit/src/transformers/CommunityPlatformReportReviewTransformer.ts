import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "./CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { CommunityPlatformReportAtSummaryTransformer } from "./CommunityPlatformReportAtSummaryTransformer";

export namespace CommunityPlatformReportReviewTransformer {
  export type Payload = Prisma.community_platform_report_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        review_action: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: CommunityPlatformReportAtSummaryTransformer.select(),
        moderator:
          CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_report_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportReview> {
    return {
      id: input.id,
      report: await CommunityPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
      moderator:
        await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      review_action: input.review_action,
      note: input.note ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
