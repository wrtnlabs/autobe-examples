import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformAdminAtSummaryTransformer } from "./CommunityPlatformAdminAtSummaryTransformer";

export namespace CommunityPlatformModerationReportsResolutionTransformer {
  export type Payload =
    Prisma.community_platform_moderation_reports_resolutionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        resolution_reason: true,
        resolution_timestamp: true,
        report: {
          select: {
            id: true,
          },
        },
        moderator: CommunityPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_reports_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationReportsResolution> {
    return {
      id: input.id,
      action: typia.assert<"approved" | "dismissed" | "escalated">(
        input.action,
      ),
      resolution_reason: input.resolution_reason ?? null,
      resolution_timestamp: toISOStringSafe(input.resolution_timestamp),
      report: {},
      moderator: await CommunityPlatformAdminAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
