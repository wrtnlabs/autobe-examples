import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
export function prepare_random_discussion_board_ban(
  input?: DeepPartial<IDiscussionBoardBan.ICreate>,
): IDiscussionBoardBan.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 5,
        wordMax: 10,
      }),
    end_date:
      input?.end_date ??
      (typia.random<boolean>()
        ? new Date(
            new Date().getTime() +
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<1> &
                  tags.Maximum<365>
              >() *
                24 *
                60 *
                60 *
                1000,
          ).toISOString()
        : undefined),
  };
}
