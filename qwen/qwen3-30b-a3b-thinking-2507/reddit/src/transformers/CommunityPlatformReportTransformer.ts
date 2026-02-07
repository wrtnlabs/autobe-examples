import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberTransformer } from "./CommunityPlatformMemberTransformer";
import { CommunityPlatformReportCategoryAtSummaryTransformer } from "./CommunityPlatformReportCategoryAtSummaryTransformer";

export namespace CommunityPlatformReportTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        reported_content_type: true,
        reported_content_id: true,
        created_at: true,
        updated_at: true,
        category: CommunityPlatformReportCategoryAtSummaryTransformer.select(),
        user: CommunityPlatformMemberTransformer.select(),
        deleted_at: true,
        community_platform_moderation_reports_resolutions: true,
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      reported_content_type: input.reported_content_type as "post" | "comment",
      reported_content_id: input.reported_content_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      category:
        await CommunityPlatformReportCategoryAtSummaryTransformer.transform(
          input.category,
        ),
      user: await CommunityPlatformMemberTransformer.transform(input.user),
    };
  }
}
