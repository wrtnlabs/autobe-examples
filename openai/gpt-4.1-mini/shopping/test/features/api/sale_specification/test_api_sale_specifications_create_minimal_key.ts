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

export async function test_api_sale_specifications_create_minimal_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and obtains authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Update connection headers with token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Seller creates a sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  const saleId = (sale as any).id as unknown as string;
  // 3. Create a sale specification with a minimal non-empty key (single character)
  const minimalSpecKey = "k";
  const specValue = "Valid specification value";
  const saleSpecification =
    await generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_id: saleId,
          specification_key: minimalSpecKey,
          specification_value: specValue,
        },
      },
    );
  typia.assert(saleSpecification);
  const saleSpec = saleSpecification as any;
  // 4. Validate linkage and data integrity
  TestValidator.equals(
    "sale id matches",
    saleSpec.shopping_mall_sale_id as unknown as string,
    saleId,
  );
  TestValidator.equals(
    "specification key matches",
    saleSpec.specification_key as unknown as string,
    minimalSpecKey,
  );
  TestValidator.equals(
    "specification value matches",
    saleSpec.specification_value as unknown as string,
    specValue,
  );
  // 5. Attempt to create specification for a sale not owned by the seller
  // For that, create a new seller, a sale under that new seller, then try to add spec using first seller's token
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(otherSellerAuth);
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSellerAuth.token.access}`,
  };
  const saleOfOtherSeller =
    await generate_random_shopping_mall_seller_sales_create(
      otherSellerConnection,
      {},
    );
  typia.assert(saleOfOtherSeller);
  const saleOfOtherSellerId = (saleOfOtherSeller as any).id as unknown as string;
  await TestValidator.error(
    "should fail to create specification for sale not owned by seller",
    async () => {
      await generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
        sellerConnection,
        {
          body: {
            shopping_mall_sale_id: saleOfOtherSellerId,
            specification_key: minimalSpecKey,
            specification_value: specValue,
          },
        },
      );
    },
  );
}
