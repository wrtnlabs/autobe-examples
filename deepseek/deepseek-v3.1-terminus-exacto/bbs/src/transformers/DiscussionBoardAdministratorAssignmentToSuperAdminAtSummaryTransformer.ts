import { IDiscussionBoardAdministratorAssignmentToSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToSuperAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardAdministratorAssignmentToSuperAdminAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_assignment_to_super_adminsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        administratorAssignment: {
          select: {
            old_role: true,
            new_role: true,
            assignment_type: true,
            reason: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_administrator_assignmentsFindManyArgs,
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_assignment_to_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorAssignmentToSuperAdmin.ISummary> {
    return {
      id: input.id,
      old_role: input.administratorAssignment.old_role,
      new_role: input.administratorAssignment.new_role,
      assignment_type: input.administratorAssignment.assignment_type,
      reason: input.administratorAssignment.reason,
      created_at: input.administratorAssignment.created_at.toISOString(),
      recipient: await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
    };
  }
}
