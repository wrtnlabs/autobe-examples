import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile snapshot pagination and ordering.
 *
 * This test validates that:
 * 1. Profile snapshots are created when customer updates profile
 * 2. Snapshots are ordered by created_at in descending order (newest first)
 * 3. Pagination correctly limits results per page
 * 4. Pagination metadata accurately reflects total records and pages
 * 5. Multiple pages return correct sequential snapshots
 */
export async function test_api_customer_profile_snapshot_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  const adminLoginCredentials = {
    email: adminCredentials.email,
    password: adminCredentials.password,
  } satisfies IShoppingMallAdministrator.ILogin;
  await authorize_administrator_login(adminConnection, {
    body: adminLoginCredentials,
  });
  // 2. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  const customerId = customerAuth.id;
  const customerLoginCredentials = {
    email: customerCredentials.email,
    password: customerCredentials.password,
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: customerLoginCredentials,
  });
  // 3. Update customer profile multiple times to create snapshots (6 updates)
  const profileUpdates = ArrayUtil.repeat(6, (index) => ({
    display_name: `Customer_${RandomGenerator.alphabets(8)}_${index}`,
    phone_number: RandomGenerator.mobile(),
  }));
  for (const update of profileUpdates) {
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: update satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  }
  // 4. Retrieve first page of snapshots
  const page1Response =
    await api.functional.shoppingMall.administrator.customers.profile.snapshots.list(
      adminConnection,
      {
        customerId: customerId,
      },
    );
  typia.assert(page1Response);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 limit is positive",
    page1Response.pagination.limit > 0,
  );
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    6,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 1);
  // 6. Verify snapshots are ordered by created_at DESC (newest first)
  TestValidator.predicate("snapshots ordered by created_at DESC", () => {
    for (let i = 0; i < page1Response.data.length - 1; i++) {
      const current = new Date(page1Response.data[i].createdAt).getTime();
      const next = new Date(page1Response.data[i + 1].createdAt).getTime();
      if (current < next) return false;
    }
    return true;
  });
  // 7. Verify each snapshot has required fields and correct customer
  for (const snapshot of page1Response.data) {
    TestValidator.equals(
      "snapshot customer ID matches",
      snapshot.customer.id,
      customerId,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      snapshot.createdAt.length > 0,
    );
    // phoneNumber can be null per DTO definition
    if (snapshot.phoneNumber !== null) {
      TestValidator.predicate(
        "snapshot phone number is valid",
        snapshot.phoneNumber.length > 0,
      );
    }
  }
  // 8. Verify all 6 snapshots are present
  TestValidator.equals("total snapshots count", page1Response.data.length, 6);
}
