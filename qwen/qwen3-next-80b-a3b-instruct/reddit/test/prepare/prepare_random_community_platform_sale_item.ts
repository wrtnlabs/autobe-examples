import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
export function prepare_random_community_platform_sale_item(
  input?: DeepPartial<ICommunityPlatformSaleItem.ICreate>,
): ICommunityPlatformSaleItem.ICreate {
  return {
    productVariantCode:
      input?.productVariantCode ?? RandomGenerator.alphaNumeric(12),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    discountCode: input?.discountCode ?? RandomGenerator.alphaNumeric(8),
  };
}
