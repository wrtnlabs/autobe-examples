import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
export function prepare_random_community_platform_sale_discount_code(
  input?: DeepPartial<ICommunityPlatformSaleDiscountCode.ICreate>,
): ICommunityPlatformSaleDiscountCode.ICreate {
  return {
    // Test-customizable fields
    discountType:
      input?.discountType ??
      RandomGenerator.pick(["percentage", "fixed"] as const),
    discountAmount:
      input?.discountAmount ??
      typia.random<number & tags.Minimum<0.01> & tags.Maximum<5000>>(),
    expirationDate:
      input?.expirationDate ??
      new Date(RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 365))
        .toISOString()
        .split("T")[0],
    maxUses:
      input?.maxUses ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    isActive: input?.isActive ?? RandomGenerator.pick([true, false] as const),
    minimumPurchaseAmount:
      input?.minimumPurchaseAmount ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<9999.99>>(),
    maxDiscountValue:
      input?.maxDiscountValue ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<9999.99>>(),
  };
}
