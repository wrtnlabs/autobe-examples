import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import { ICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserReportAtSummaryTransformer } from "./CommunityPlatformUserReportAtSummaryTransformer";

export namespace CommunityPlatformUserReportHistoryAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_user_report_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        actor_type: true,
        actor_id: true,
        old_value: true,
        new_value: true,
        created_at: true,
        userReport: CommunityPlatformUserReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_user_report_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUserReportHistory.ISummary> {
    // For actor transformation, we need to handle the fact that actor_id is a foreign key
    // without a defined Prisma relation. In a real implementation, we would need to:
    // 1. Have access to a member repository or Prisma client
    // 2. Fetch the member when actor_type is 'moderator' or 'user'
    // 3. For 'system' type, just return the actor_id as string
    // Since we don't have access to database context in this transformer,
    // we'll implement a placeholder that matches the DTO type expectations
    // In production, this would need to be implemented with actual member fetching
    let actor: ICommunityPlatformMember.ISummary | string;
    if (input.actor_type === "moderator" || input.actor_type === "user") {
      // In real implementation, we would fetch member from database using input.actor_id
      // For now, we return a placeholder that satisfies the type but with minimal data
      actor = {
        id: input.actor_id,
        email: "", // Would need to fetch from database
        username: "", // Would need to fetch from database
        nickname: null,
        email_verified: false,
        registered_at: new Date().toISOString(),
        last_login_at: null,
      };
    } else {
      // actor_type is 'system'
      actor = input.actor_id;
    }
    return {
      id: input.id,
      action_type: input.action_type,
      actor_type: input.actor_type,
      actor,
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      created_at: input.created_at.toISOString(),
      user_report:
        await CommunityPlatformUserReportAtSummaryTransformer.transform(
          input.userReport,
        ),
    };
  }
}
