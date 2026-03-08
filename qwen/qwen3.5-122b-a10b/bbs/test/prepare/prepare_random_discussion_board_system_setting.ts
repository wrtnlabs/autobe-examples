import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_setting(
  input?: DeepPartial<IDiscussionBoardSystemSetting.ICreate>,
): IDiscussionBoardSystemSetting.ICreate {
  return {
    key:
      input?.key ??
      typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
    value:
      input?.value ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })
        : null),
  };
}
