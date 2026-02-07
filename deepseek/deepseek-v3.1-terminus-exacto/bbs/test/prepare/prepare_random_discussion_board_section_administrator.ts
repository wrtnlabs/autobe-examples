import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_section_administrator(
  input?: DeepPartial<IDiscussionBoardSectionAdministrator.ICreate>,
): IDiscussionBoardSectionAdministrator.ICreate {
  return {
    permission_level:
      input?.permission_level ??
      RandomGenerator.pick(["read", "write", "manage", "admin"] as const),
    discussion_board_admin_id: input?.discussion_board_admin_id ?? null,
    discussion_board_super_admin_id:
      input?.discussion_board_super_admin_id ?? null,
  };
}
