import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent cart item.
 *
 * 1. Authenticate as a customer to establish session.
 * 2. Generate a random UUID that is guaranteed not to exist.
 * 3. Attempt to retrieve the non-existent cart item.
 * 4. Verify that the API returns HTTP 404 Not Found status.
 */
export async function test_api_cart_item_retrieve_not_found_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a random UUID that definitely doesn't exist
  const nonExistentCartItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try to fetch non-existent cart item and verify it throws 404
  await TestValidator.httpError(
    "should return 404 for non-existent cart item",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.cart_items.at(
        customerConnection,
        {
          cartItemId: nonExistentCartItemId,
        },
      );
    },
  );
}
