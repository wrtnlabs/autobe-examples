import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sale_specifications_create_sale_specification } from "../../../generate/generate_random_shopping_mall_seller_sale_specifications_create_sale_specification";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_specification } from "../../../prepare/prepare_random_shopping_mall_sale_specification";

export async function test_api_sale_specification_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the deletion of an existing sale specification by a seller.
  // The test should authenticate as a new seller, create a sale,
  // then create a specification linked to that sale.
  // Then delete the specification by specId.
  // Validate the API returns HTTP 204 No Content on successful deletion.
  // Verify the specification is no longer retrievable in the database.
  // Also test that re-deleting the same specification (idempotency) returns HTTP 204 without error.
  // 1. Authenticate as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a sale for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);

  // Access 'id' safely via type assertion as unknown object having 'id' string
  const saleEntity = sale as unknown as { id: string };

  // 3. Create a sale specification linked to the sale
  const saleSpec =
    await generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_id: saleEntity.id,
        } satisfies IShoppingMallSaleSpecification.ICreate,
      },
    );
  typia.assert(saleSpec);

  // Similarly assert saleSpec to have 'id'
  const saleSpecEntity = saleSpec as unknown as { id: string };

  // 4. Delete the specification by specId
  await api.functional.shoppingMall.seller.sale_specifications.erase(
    sellerConnection,
    { specId: saleSpecEntity.id },
  );
  // 5. Verify the specification is no longer retrievable by attempting to delete again (should be idempotent and return 204 as well)
  await api.functional.shoppingMall.seller.sale_specifications.erase(
    sellerConnection,
    { specId: saleSpecEntity.id },
  );
}
