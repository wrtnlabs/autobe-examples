import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
export function prepare_random_community_platform_product_variant(
  input?: DeepPartial<ICommunityPlatformProductVariant.ICreate>,
): ICommunityPlatformProductVariant.ICreate {
  return {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    variant_name:
      input?.variant_name ??
      RandomGenerator.name(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      ),
    price:
      input?.price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<99999>
      >(),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
    attributes: input?.attributes
      ? input.attributes.map((attr) => ({
          productCode: attr.productCode ?? RandomGenerator.alphaNumeric(8),
          key:
            attr.key ??
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<3> &
                  tags.Maximum<10>
              >(),
            ),
          value:
            attr.value ??
            RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              wordMin: 2,
              wordMax: 6,
            }),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            productCode: RandomGenerator.alphaNumeric(8),
            key: RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<3> &
                  tags.Maximum<10>
              >(),
            ),
            value: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              wordMin: 2,
              wordMax: 6,
            }),
          }),
        ),
  };
}
