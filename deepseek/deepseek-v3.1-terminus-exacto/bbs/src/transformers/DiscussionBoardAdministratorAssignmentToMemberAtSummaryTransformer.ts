import { IDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToMember";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardAdministratorAssignmentToMemberAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_assignment_to_membersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        assignment: {
          select: {
            old_role: true,
            new_role: true,
            assignment_type: true,
            reason: true,
          },
        } satisfies Prisma.discussion_board_administrator_assignmentsFindManyArgs,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        memberSession: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_member_sessionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_administrator_assignment_to_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorAssignmentToMember.ISummary> {
    return {
      id: input.id,
      old_role: input.assignment.old_role,
      new_role: input.assignment.new_role,
      assignment_type: input.assignment.assignment_type,
      reason: input.assignment.reason ?? undefined,
      created_at: input.created_at.toISOString(),
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
