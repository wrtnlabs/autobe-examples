import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_member(
  input?: DeepPartial<IDiscussionBoardMember.ICreate>,
): IDiscussionBoardMember.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password_hash: input?.password_hash ?? RandomGenerator.alphaNumeric(64),
    display_name: input?.display_name ?? RandomGenerator.name(),
    bio:
      input?.bio ??
      (Math.random() < 0.3
        ? null
        : RandomGenerator.paragraph({
            sentences: Math.floor(Math.random() * 3) + 1,
          })),
  };
}
