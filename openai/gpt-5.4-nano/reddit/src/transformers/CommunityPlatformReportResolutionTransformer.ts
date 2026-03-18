import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportResolutionTransformer {
  export type Payload = Prisma.community_platform_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_report_id: true,
        moderated_by_user_id: true,
        resolution_decision: true,
        moderation_note: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportResolution> {
    return {
      id: input.id,
      communityPlatformReportId: input.community_platform_report_id,
      moderatedByUserId: input.moderated_by_user_id,
      resolutionDecision: input.resolution_decision,
      moderationNote: input.moderation_note,
      resolvedAt: input.resolved_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
