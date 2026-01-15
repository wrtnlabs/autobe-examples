import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
export function prepare_random_discussion_board_user(
  input?: DeepPartial<IDiscussionBoardUser.ICreate>,
): IDiscussionBoardUser.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password: input?.password ?? RandomGenerator.alphaNumeric(16),
    username:
      input?.username ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<30>
        >(),
      ),
    display_name:
      input?.display_name ??
      (input?.display_name === null ? undefined : RandomGenerator.name()),
    bio:
      input?.bio ??
      (input?.bio === null
        ? undefined
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          })),
  };
}