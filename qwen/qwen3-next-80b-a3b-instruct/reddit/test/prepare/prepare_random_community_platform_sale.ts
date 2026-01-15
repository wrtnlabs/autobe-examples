import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
export function prepare_random_community_platform_sale(
  input?: DeepPartial<ICommunityPlatformSale.ICreate>,
): ICommunityPlatformSale.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    price: input?.price ?? typia.random<number & tags.Minimum<0>>(),
    currency_code:
      input?.currency_code ?? RandomGenerator.alphabets(3).toUpperCase(),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 10 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
