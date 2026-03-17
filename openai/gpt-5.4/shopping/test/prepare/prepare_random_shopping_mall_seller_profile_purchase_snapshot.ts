import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_profile_purchase_snapshot(
  input?: DeepPartial<IShoppingMallSellerProfilePurchaseSnapshot.ICreate>,
): IShoppingMallSellerProfilePurchaseSnapshot.ICreate {
  return {
    shop_name: input?.shop_name ?? RandomGenerator.name(2),
    logo_uri:
      input?.logo_uri !== undefined
        ? input.logo_uri
        : typia.random<string & tags.Format<"uri">>(),
  };
}
