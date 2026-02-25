import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_email_template(
  input?: DeepPartial<IEcommerceEmailTemplate.ICreate>,
): IEcommerceEmailTemplate.ICreate {
  return {
    code: input?.code ?? typia.random<string & tags.Format<"uuid">>(),
    name: input?.name ?? RandomGenerator.name() + " Template",
    category:
      input?.category ??
      RandomGenerator.pick([
        "registration",
        "order",
        "password",
        "administrative",
      ] as const),
    subject:
      input?.subject ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    html_content:
      input?.html_content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    text_content:
      input?.text_content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
