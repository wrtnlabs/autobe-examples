import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemActivityTransformer {
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
          select: { id: true, display_name: true, bio: true, created_at: true },
        },
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        superAdmin: { select: { id: true } },
      },
    } satisfies Prisma.discussion_board_system_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemActivity> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      target_entity_type: input.target_entity_type ?? null,
      target_entity_id: input.target_entity_id ?? null,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      referrer: input.referrer ?? null,
      activity_details: input.activity_details
        ? JSON.parse(input.activity_details)
        : null,
      success_status: input.success_status,
      error_message: input.error_message ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: null,
      admin: null,
      super_admin: null,
    };
  }
}
