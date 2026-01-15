import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";
export function prepare_random_discussion_board_comment_mod_action(
  input?: DeepPartial<IDiscussionBoardCommentModAction.ICreate>,
): IDiscussionBoardCommentModAction.ICreate {
  return {
    action_type: RandomGenerator.pick([
      "remove",
      "warn",
      "hide",
      "dismiss",
    ] as const),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    notify_author:
      input?.notify_author ?? RandomGenerator.pick([true, false] as const),
    notify_community:
      input?.notify_community ?? RandomGenerator.pick([true, false] as const),
    tags: input?.tags
      ? input.tags.map(
          (tag) => tag as string & tags.MinLength<1> & tags.MaxLength<50>,
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
          () => {
            const word = RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            );
            const commonTags = [
              "spam",
              "hate_speech",
              "doxxing",
              "impersonation",
              "trolling",
              "nudity",
              "threats",
              "copyright_violation",
              "repeated_violation",
            ];
            return RandomGenerator.pick([...commonTags, word] as const);
          },
        ),
  };
}
