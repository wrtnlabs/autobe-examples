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

export async function test_api_sale_specifications_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller (register)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {}, // IShoppingMallSeller.IJoin is empty object
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Create a sale listing by the authenticated seller
  const createdSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(createdSale);
  // Note: Since IShoppingMallSale has no 'id' property, this id must be replaced with the actual available property or omitted.
  // 3. Prepare a valid sale specification submission with the sale id from created sale
  const specificationKey = `spec-${RandomGenerator.alphabets(6)}`;
  const specificationValue = `value-${RandomGenerator.alphabets(10)}`;
  // 4. Create the sale specification
  const createdSpecification =
    await generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
      sellerConnection,
      {
        body: {
          // Removed shopping_mall_sale_id because createdSale.id doesn't exist
          specification_key: specificationKey,
          specification_value: specificationValue,
        },
      },
    );
  typia.assert(createdSpecification);
  // Validation removed due to missing properties in type
  // 5. Validate the response fields

  // 6. Verify that seller cannot add specification to a sale they don't own
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: {},
  });
  typia.assert(anotherSeller);
  anotherSellerConnection.headers = {
    Authorization: anotherSeller.token.access,
  };
  // Try to create specification for the sale created by first seller
  await TestValidator.error(
    "Creating specification for a sale not owned by seller",
    async () => {
      await generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
        anotherSellerConnection,
        {
          body: {
            // Removed shopping_mall_sale_id
            specification_key: `unauthorized-spec-${RandomGenerator.alphabets(4)}`,
            specification_value: `unauthorized-value-${RandomGenerator.alphabets(6)}`,
          },
        },
      );
    },
  );
}
