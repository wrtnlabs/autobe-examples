import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer category browsing for active taxonomy navigation.
 *
 * Verifies that an authenticated customer can access the marketplace category browse endpoint and receive a paginated category collection. The response is validated as a storefront taxonomy payload with pagination metadata and category summary fields.
 *
 * The test also confirms that any returned subcategory references remain only one level deep, so the taxonomy does not expose recursive nesting beyond the supported parent-child structure.
 *
 * 1. Registers and authenticates a customer using the customer join utility.
 * 2. Fetches the category catalog using the authenticated customer connection.
 * 3. Validates pagination metadata and category summary shape.
 * 4. Confirms parent category references remain one level deep without recursive nesting.
 */
export async function test_api_customer_category_browsing_active_taxonomy(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: customerConnection.host,
      referrer: customerConnection.host,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.categories.get(
      customerConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination should have a non-negative current page",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have a non-negative limit",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have a non-negative record count",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have a non-negative page count",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page should not exceed total pages when pages exist",
    output.pagination.pages === 0 ||
      output.pagination.current <= output.pagination.pages,
  );
  TestValidator.predicate(
    "data length should not exceed pagination limit when a limit is provided",
    output.pagination.limit === 0 ||
      output.data.length <= output.pagination.limit,
  );
  for (const category of output.data) {
    if (category.parentCategory !== null) {
      TestValidator.predicate(
        "subcategory parent should not expose deeper nesting",
        category.parentCategory.parentCategory === null,
      );
    }
  }
}
