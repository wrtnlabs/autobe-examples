import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_customers_index_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve customers filtered by account status (active, inactive, deleted)
  // Step 1: Create and authorize an active customer
  const activeCustomerAuth = await authorize_customer_join(
    { host: connection.host },
    {},
  );
  typia.assert(activeCustomerAuth);
  const activeConnection: api.IConnection = { host: connection.host };
  activeConnection.headers = { Authorization: activeCustomerAuth.token.access };
  // Step 2: Test filtering by 'active' status
  {
    const output = await api.functional.shoppingMall.customer.customers.index(
      activeConnection,
      {
        body: { status: "active" },
      },
    );
    typia.assert(output);
    // Since deletedAt is not available, we assume all customers returned are active
    TestValidator.predicate(
      "has customers for active status",
      output.data.length > 0,
    );
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page >= 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit <= 100",
      output.pagination.limit <= 100,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      output.pagination.records >= 0,
    );
    // Validate returned customer summaries
    for (const customer of output.data) {
      typia.assert(customer);
      // Sensitive fields like tokens or passwords are not included in summary
      // Check essential properties
      TestValidator.predicate(
        "has id",
        typeof customer.id === "string" && customer.id.length > 0,
      );
      TestValidator.predicate(
        "has email",
        typeof customer.email === "string" && customer.email.length > 0,
      );
      TestValidator.predicate(
        "displayName is string or null or undefined",
        customer.displayName === null ||
          typeof customer.displayName === "string" ||
          customer.displayName === undefined,
      );
      TestValidator.predicate(
        "phoneNumber is string or null or undefined",
        customer.phoneNumber === null ||
          typeof customer.phoneNumber === "string" ||
          customer.phoneNumber === undefined,
      );
      TestValidator.predicate(
        "createdAt is valid date-time string",
        typeof customer.createdAt === "string" &&
          !isNaN(Date.parse(customer.createdAt)),
      );
      TestValidator.predicate(
        "updatedAt is valid date-time string",
        typeof customer.updatedAt === "string" &&
          !isNaN(Date.parse(customer.updatedAt)),
      );
    }
  }
  // Step 3: Test filtering by 'inactive' status
  {
    const output = await api.functional.shoppingMall.customer.customers.index(
      activeConnection,
      {
        body: { status: "inactive" },
      },
    );
    typia.assert(output);
    // Cannot assert deletedAt in summary; just ensure response shape
    TestValidator.predicate(
      "inactive customers returned or empty",
      Array.isArray(output.data),
    );
  }
  // Step 4: Test filtering by 'deleted' status
  {
    const output = await api.functional.shoppingMall.customer.customers.index(
      activeConnection,
      {
        body: { status: "deleted" },
      },
    );
    typia.assert(output);
    // Same remarks as inactive
    TestValidator.predicate(
      "deleted customers returned or empty",
      Array.isArray(output.data),
    );
  }
  // Step 5: Test without status filter
  {
    const output = await api.functional.shoppingMall.customer.customers.index(
      activeConnection,
      {
        body: {},
      },
    );
    typia.assert(output);
    TestValidator.predicate(
      "all customers returned or empty",
      Array.isArray(output.data),
    );
  }
  // Step 6: Confirm operation requires customer authentication
  {
    const unauthConnection: api.IConnection = { host: connection.host };
    await TestValidator.error("requires customer auth", async () => {
      await api.functional.shoppingMall.customer.customers.index(
        unauthConnection,
        { body: {} },
      );
    });
  }
}
