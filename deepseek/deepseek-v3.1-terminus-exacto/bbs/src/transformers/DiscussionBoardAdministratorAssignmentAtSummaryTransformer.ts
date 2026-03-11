import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorAssignmentAtSummaryTransformer {
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
        administrativeHistories: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrative_historiesFindManyArgs,
        memberAdministratorAssignment: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_by_membersFindManyArgs,
        assignmentToAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_to_adminsFindManyArgs,
        assignmentToSuperAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_to_super_adminsFindManyArgs,
        assignmentByMember: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_by_membersFindManyArgs,
        performedByAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_by_adminsFindManyArgs,
        assignerSuperAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_administrator_assignment_by_super_adminsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_administrator_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorAssignment.ISummary> {
    return {
      id: input.id,
      old_role: input.old_role,
      new_role: input.new_role,
      assignment_type: input.assignment_type,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
