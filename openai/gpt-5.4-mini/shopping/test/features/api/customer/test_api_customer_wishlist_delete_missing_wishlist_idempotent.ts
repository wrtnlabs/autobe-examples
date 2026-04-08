import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify that deleting a missing customer wishlist succeeds idempotently.
 *
 * This scenario validates the customer wishlist deletion flow when the
 * authenticated customer does not have an existing wishlist record. It checks
 * that the endpoint completes successfully without requiring a preexisting
 * wishlist and without creating any response payload.
 *
 * 1. Register a new customer account and obtain authenticated access.
 * 2. Call the wishlist deletion endpoint for the authenticated customer.
 * 3. Confirm the request succeeds and returns no response body.
 */
export async function test_api_customer_wishlist_delete_missing_wishlist_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: undefined,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await api.functional.mallPlatform.customer.wishlists.erase(
    customerConnection,
  );
}
