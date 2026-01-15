import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestion";
export function prepare_random_community_platform_product_question(
  input?: DeepPartial<ICommunityPlatformProductQuestion.ICreate>,
): ICommunityPlatformProductQuestion.ICreate {
  return {
    productCode:
      input?.productCode ??
      `${RandomGenerator.alphabets(3).toUpperCase()}-${RandomGenerator.alphaNumeric(5)}`,
    questionText:
      input?.questionText ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 5,
        wordMax: 20,
      }),
  };
}
