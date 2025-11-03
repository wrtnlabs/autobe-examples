import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate customer account self-deletion and aftermath.
 *
 * 1. Register a new customer using valid, randomly generated details
 * 2. Delete the customer using their own authentication (self-deletion)
 * 3. Confirm deletion is effective: retry deletion and expect business error
 */
export async function test_api_customer_account_deletion_by_self(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const href = "https://example.com/signup";
  const referrer = "https://example.com/landing";

  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: password as string & tags.MinLength<8> & tags.MaxLength<128>,
        name: name as string & tags.MinLength<1> & tags.MaxLength<100>,
        phone: phone as string & tags.MinLength<7> & tags.MaxLength<20>,
        href: href as string & tags.Format<"uri">,
        referrer: referrer as string & tags.Format<"uri">,
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. As that customer, perform deletion of their own account
  await api.functional.shopping.customer.customers.erase(connection, {
    customerId: customer.id,
  });

  // 3. Confirm deletion is effective by retrying deletion and expecting business logic error
  await TestValidator.error("self-deletion twice must fail", async () => {
    await api.functional.shopping.customer.customers.erase(connection, {
      customerId: customer.id,
    });
  });
}
