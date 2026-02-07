import { IDiscussionBoardAdministratorCapabilityAssignItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapabilityAssignItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorCapabilityAssignItemTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_capabilitiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        capability_type: true,
        permission_level: true,
        assigned_by: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: true,
      },
    } satisfies Prisma.discussion_board_administrator_capabilitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorCapabilityAssignItem> {
    return {
      capability_type: typia.assert<
        | "content_moderation"
        | "user_management"
        | "section_admin"
        | "system_config"
      >(input.capability_type),
      permission_level: typia.assert<
        "read_only" | "full_access" | "limited_scope"
      >(input.permission_level),
    };
  }
}
