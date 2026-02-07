import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "./DiscussionBoardAdministratorPromotionApprovalTransformer";

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
        assigned_by_admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator:
          DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
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
      assigned_by: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.assigned_by_admin,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      administrator:
        await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
          input.administrator,
        ),
    };
  }
}
