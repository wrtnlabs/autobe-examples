import { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_admin_hierarchy_action(
  input?: DeepPartial<IDiscussionBoardAdminHierarchyAction.ICreate>,
): IDiscussionBoardAdminHierarchyAction.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  };
}
