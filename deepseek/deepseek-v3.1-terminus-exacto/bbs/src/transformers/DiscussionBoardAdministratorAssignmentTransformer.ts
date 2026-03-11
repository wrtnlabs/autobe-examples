import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorAssignmentTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_assignmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        old_role: true,
        new_role: true,
        assignment_type: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrativeHistories: true,
        memberAdministratorAssignment: true,
        assignmentToAdmin: true,
        assignmentToSuperAdmin: true,
        assignmentByMember: true,
        performedByAdmin: true,
        assignerSuperAdmin: true,
      },
    } satisfies Prisma.discussion_board_administrator_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorAssignment> {
    return {
      id: input.id,
      old_role: input.old_role,
      new_role: input.new_role,
      assignment_type: input.assignment_type,
      reason: input.reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
