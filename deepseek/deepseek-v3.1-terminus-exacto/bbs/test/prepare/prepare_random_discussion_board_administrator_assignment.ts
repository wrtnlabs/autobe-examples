import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_administrator_assignment(
  input?:
    | DeepPartial<IDiscussionBoardAdministratorAssignment.ICreate>
    | undefined,
): IDiscussionBoardAdministratorAssignment.ICreate {
  // Determine assignment_type first
  const assignment_type =
    input?.assignment_type ??
    RandomGenerator.pick([
      "promotion",
      "demotion",
      "initial",
      "system",
    ] as const);
  // Helper to generate new_role based on old_role and assignment_type
  const generateNewRole = (oldRole: string, type: string): string => {
    const roles = ["member", "admin", "super_admin"] as const;
    const index = roles.indexOf(oldRole as any);
    switch (type) {
      case "promotion":
        // Promote up one level if possible
        return index < 2 ? roles[index + 1] : roles[index];
      case "demotion":
        // Demote down one level if possible
        return index > 0 ? roles[index - 1] : roles[index];
      case "initial":
        // Initial assignment to admin
        return "admin";
      default: // 'system' or fallback
        return RandomGenerator.pick(roles);
    }
  };
  // Determine old_role
  const old_role =
    input?.old_role ??
    RandomGenerator.pick(["member", "admin", "super_admin"] as const);
  // Determine new_role - use input if provided, otherwise generate
  const new_role =
    input?.new_role ?? generateNewRole(old_role, assignment_type);
  // Generate reason - allow null
  const reason =
    input?.reason ??
    (Math.random() > 0.5
      ? RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 1,
          sentenceMax: 3,
        })
      : null);
  return {
    old_role,
    new_role,
    assignment_type,
    reason,
  };
}