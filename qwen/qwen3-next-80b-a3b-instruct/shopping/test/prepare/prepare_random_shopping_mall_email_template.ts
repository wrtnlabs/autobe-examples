import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
export function prepare_random_shopping_mall_email_template(
  input?: DeepPartial<IShoppingMallEmailTemplate.ICreate>,
): IShoppingMallEmailTemplate.ICreate {
  return {
    templateKey:
      input?.templateKey ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<4> & tags.Maximum<10>
        >(),
      )
        .replace(/[a-z]+/g, (s) => s + "_")
        .slice(0, -1) +
        RandomGenerator.alphaNumeric(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
          >(),
        ),
    subject:
      input?.subject ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 8 }),
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        sentenceMin: 8,
        sentenceMax: 18,
        wordMin: 4,
        wordMax: 8,
      }),
    fromAddress:
      input?.fromAddress ??
      typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    replyToAddress:
      input?.replyToAddress ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>()
        : undefined),
    isHtml:
      input?.isHtml ??
      RandomGenerator.pick([true, true, true, true, false] as const),
  };
}
