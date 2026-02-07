import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemActivityAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_system_activitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        target_entity_type: true,
        target_entity_id: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        activity_details: true,
        success_status: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            display_name: true,
          },
        },
        admin: {
          select: {
            display_name: true,
          },
        },
        superAdmin: {
          select: {
            email: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_system_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemActivity.ISummary> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      actor_display_name:
        input.user?.display_name ??
        input.admin?.display_name ??
        input.superAdmin?.email ??
        "Unknown Actor",
      success_status: input.success_status,
      created_at: input.created_at.toISOString(),
    };
  }
}
