import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalesPromoCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromoCode";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sales_promo_code(
  input?: DeepPartial<IShoppingMallSalesPromoCode.ICreate> | undefined,
): IShoppingMallSalesPromoCode.ICreate {
  return {
    code:
      input?.code ??
      `PROMO-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>().toString().padStart(4, "0")}-${new Date().getFullYear()}`,
    discount_percentage:
      input?.discount_percentage ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    expiry_date:
      input?.expiry_date ??
      new Date(new Date().getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    usage_limit:
      input?.usage_limit ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    max_usage:
      input?.max_usage ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
