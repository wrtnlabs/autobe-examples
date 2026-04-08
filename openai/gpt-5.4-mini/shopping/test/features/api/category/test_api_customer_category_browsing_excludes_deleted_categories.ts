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
 * Verifies that customer category browsing excludes deleted categories.
 *
 * This test validates the customer-facing category browse response and ensures
 * that deleted categories are not exposed to signed-in customers. It also
 * confirms that active categories remain browsable and that any one-level
 * nested taxonomy returned by the endpoint stays limited to active records.
 *
 * 1. Register and authenticate a customer with a dedicated connection.
 * 2. Browse the customer category list.
 * 3. Validate the response shape and pagination metadata.
 * 4. Assert every returned category is active.
 * 5. Assert any returned parent category reference is also active.
 */
export async function test_api_customer_category_browsing_excludes_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.categories.get(
      customerConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "category browse response should include valid pagination metadata",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "customer category browse should return only active categories",
    output.data.every((category) => category.deletedAt === null),
  );
  TestValidator.predicate(
    "customer category browse should not expose deleted parent categories",
    output.data.every(
      (category) =>
        category.parentCategory === null ||
        category.parentCategory.deletedAt === null,
    ),
  );
}
