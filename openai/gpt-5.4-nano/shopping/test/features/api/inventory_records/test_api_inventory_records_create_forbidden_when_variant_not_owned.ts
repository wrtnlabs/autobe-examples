import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_records_create_forbidden_when_variant_not_owned(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const memberB = await authorize_member_join(memberBConnection, {});
  TestValidator.notEquals("member A vs member B", memberA.id, memberB.id);
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberAConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberAConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(variant);
  const forbiddenBody: IShoppingMallInventoryRecord.ICreate = {
    shopping_mall_product_variant_id: variant.id,
    stock_quantity: 0,
    reserved_quantity: 0,
    available_quantity: 0,
  };
  await TestValidator.error(
    "forbidden when member creates inventory record for another member's variant",
    async () => {
      await generate_random_shopping_mall_member_inventory_records_create(
        memberBConnection,
        {
          body: forbiddenBody satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    },
  );
  // Sanity check: the variant still belongs to member A and A can create inventory records.
  const okRecord =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberAConnection,
      {
        body: forbiddenBody satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(okRecord);
}
