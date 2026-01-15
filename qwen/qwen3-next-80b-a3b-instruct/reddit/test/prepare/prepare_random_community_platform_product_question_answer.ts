import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestionAnswer";
export function prepare_random_community_platform_product_question_answer(
  input?:
    | DeepPartial<ICommunityPlatformProductQuestionAnswer.ICreate>
    | undefined,
): ICommunityPlatformProductQuestionAnswer.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
    isAnonymous:
      input?.isAnonymous ?? RandomGenerator.pick([true, false] as const),
    tags: input?.tags
      ? input.tags.map((tag) => tag)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          () =>
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            ),
        ),
  };
}
