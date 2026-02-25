import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customers_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create test customers with diverse attributes using isolated connections
  const customers: IEcommerceCustomer.IAuthorized[] = [];
  // Create customer 1
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: "john.doe@test.com",
      password: "password123",
      display_name: "John Doe",
      phone_number: "010-1234-5678",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer1);
  customers.push(customer1);
  // Create customer 2
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: "jane.smith@test.com",
      password: "password123",
      display_name: "Jane Smith",
      phone_number: "010-2345-6789",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer2);
  customers.push(customer2);
  // Create customer 3 with similar display name
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3 = await authorize_customer_join(customer3Connection, {
    body: {
      email: "johnathan@test.com",
      password: "password123",
      display_name: "Johnathan Doe",
      phone_number: "010-3456-7890",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer3);
  customers.push(customer3);
  // Create customer 4 with different creation time
  await new Promise((resolve) => setTimeout(resolve, 100));
  const customer4Connection: api.IConnection = { host: connection.host };
  const customer4 = await authorize_customer_join(customer4Connection, {
    body: {
      email: "mike.johnson@test.com",
      password: "password123",
      display_name: "Mike Johnson",
      phone_number: "010-4567-8901",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer4);
  customers.push(customer4);
  // Test empty filter (should return all non-deleted customers)
  const allResults = await api.functional.ecommerce.customers.index(
    connection,
    {
      body: {} satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.equals(
    "empty filter returns all customers",
    allResults.data.length,
    4,
  );
  // Test email exact match
  const emailResults = await api.functional.ecommerce.customers.index(
    connection,
    {
      body: {
        email: "john.doe@test.com",
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(emailResults);
  TestValidator.equals(
    "email exact match returns exactly one customer",
    emailResults.data.length,
    1,
  );
  TestValidator.equals(
    "email match returns correct customer",
    emailResults.data[0].email,
    "john.doe@test.com",
  );
  // Test display name partial match
  const nameResults = await api.functional.ecommerce.customers.index(
    connection,
    {
      body: {
        display_name: "John",
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(nameResults);
  TestValidator.predicate(
    "display name partial match returns matching customers",
    nameResults.data.length >= 2,
  );
  // Test creation date range filtering
  const startDate = new Date(customer1.created_at);
  const endDate = new Date(customer4.created_at);
  const dateRangeResults = await api.functional.ecommerce.customers.index(
    connection,
    {
      body: {
        created_at_start: startDate.toISOString(),
        created_at_end: endDate.toISOString(),
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filter returns customers",
    dateRangeResults.data.length > 0,
  );
  // Test combined filters
  const combinedResults = await api.functional.ecommerce.customers.index(
    connection,
    {
      body: {
        email: "john.doe@test.com",
        display_name: "John",
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filters work correctly",
    combinedResults.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns correct customer",
    combinedResults.data[0].email,
    "john.doe@test.com",
  );
  // Test non-existent email
  const noResults = await api.functional.ecommerce.customers.index(connection, {
    body: {
      email: "nonexistent@test.com",
    } satisfies IEcommerceCustomer.IRequest,
  });
  typia.assert(noResults);
  TestValidator.equals(
    "non-existent email returns empty results",
    noResults.data.length,
    0,
  );
}
