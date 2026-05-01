import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOptionValue";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that querying option values for a non-existent variant returns 404.
 *
 * Validates the variant existence and product-scoping check in the variant
 * option values retrieval endpoint. When a customer queries with a variant ID
 * that does not correspond to any variant in the system, the server must
 * reject the request with a 404 Not Found response, confirming that both the
 * variant existence check and the product-variant association validation are
 * enforced.
 *
 * 1. Customer registers and authenticates via authorize_customer_join.
 * 2. Random product and variant UUIDs are generated.
 * 3. The customer queries the variant option values endpoint.
 * 4. Asserts that the server returns a 404 Not Found error.
 */
export async function test_api_variant_option_values_variant_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant not found returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.products.variants.options.index(
        customerConnection,
        {
          productId,
          variantId,
          body: {} satisfies IShoppingMallProductVariantOptionValue.IRequest,
        },
      );
    },
  );
}
