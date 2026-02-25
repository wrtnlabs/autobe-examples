import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportsDecisionAtSummaryTransformer {
  export type Payload = Prisma.community_platform_reports_decisionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_id: true,
        decision: true,
        comments: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.community_platform_moderatorsFindManyArgs,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_reports_decisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportsDecision.ISummary> {
    return {
      id: input.id,
      report_id: input.report_id,
      status: input.decision as "approved" | "dismissed",
      comment: input.comments ?? undefined,
      moderator: input.moderator
        ? {
            id: input.moderator.id,
            displayName: input.moderator.display_name,
            avatarUrl: input.moderator.avatar_url ?? undefined,
            karmaScore: 0, // karma_score removed, assign a safe default
          }
        : {
            id: "",
            displayName: "",
            avatarUrl: undefined,
            karmaScore: 0,
          },
      created_at: toISOStringSafe(input.created_at),
      updated_at: input.updated_at ? toISOStringSafe(input.updated_at) : null,
    };
  }
}
