import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_delete_other_customers_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: ensure a customer cannot delete another customer's wishlist.
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerB);
  const targetWishlistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "customer A cannot delete customer B wishlist",
    async () => {
      await api.functional.mallPlatform.customer.wishlists.erase(
        customerAConnection,
        {
          wishlistId: targetWishlistId,
        },
      );
    },
  );
  TestValidator.notEquals(
    "customers must be distinct accounts",
    customerA.id,
    customerB.id,
  );
  TestValidator.notEquals(
    "customers must have distinct emails",
    customerA.email,
    customerB.email,
  );
}
