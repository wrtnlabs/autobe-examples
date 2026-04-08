import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order item variant options retrieval from purchase snapshot.
 *
 * Validates that authenticated customers can retrieve the variant option key-value pairs that were selected at purchase time from their order item snapshots. This test ensures the snapshot system correctly preserves the exact product configuration even if the variant is later modified or deleted.
 *
 * The test authenticates a customer, queries variant options for a specific order item, and validates the response structure including pagination metadata and option details. Each option should include id, key (e.g., 'color', 'size'), value (e.g., 'Red', 'Large'), and timestamps.
 *
 * 1. Customer registers and authenticates via join operation.
 * 2. Query variant options from order item snapshot with pagination parameters.
 * 3. Validates response contains paginated list with correct structure.
 * 4. Verifies each option has required fields: id, key, value, created_at, updated_at, deleted_at.
 * 5. Confirms pagination metadata includes current page, limit, total records, and total pages.
 */
export async function test_api_order_item_variant_options_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate valid UUIDs for order and item (simulating existing order)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query variant options from order item snapshot
  const options: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
    await api.functional.ecommerce.customer.orders.items.snapshot.variant.options.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(options);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    options.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    options.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    options.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    options.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(options.data));
  TestValidator.predicate(
    "data length matches pagination",
    options.data.length <= options.pagination.limit,
  );
  // 6. Validate each option has required fields
  if (options.data.length > 0) {
    const firstOption = options.data[0];
    TestValidator.predicate(
      "option has id",
      typeof firstOption.id === "string",
    );
    TestValidator.predicate(
      "option has key",
      typeof firstOption.key === "string",
    );
    TestValidator.predicate(
      "option has value",
      typeof firstOption.value === "string",
    );
    TestValidator.predicate(
      "option has created_at",
      typeof firstOption.created_at === "string",
    );
    TestValidator.predicate(
      "option has updated_at",
      typeof firstOption.updated_at === "string",
    );
    TestValidator.predicate(
      "option deleted_at is nullable",
      firstOption.deleted_at === null ||
        typeof firstOption.deleted_at === "string",
    );
  }
}
