import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardAdministratorCapabilityTransformer {
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
        administrator: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_capabilitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorCapability> {
    return {
      id: input.id,
      capability_type: input.capability_type,
      permission_level: input.permission_level,
      assigned_by: input.assigned_by,
      administrator:
        await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
          input.administrator,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
