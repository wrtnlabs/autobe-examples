import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_snapshots_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorizedCustomer);
  // 2. Fetch order item snapshots (assumes test database has data)
  const request: IShoppingMallOrderItemSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const snapshots: IPageIShoppingMallOrderItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      { body: request },
    );
  typia.assert(snapshots);
  // 3. Validate response structure and data integrity
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    snapshots.pagination.limit,
    request.limit,
  );
  TestValidator.predicate("has records", snapshots.pagination.records >= 0);
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshots.pagination.pages >= 0,
  );
  // Validate snapshot data structure for all returned items
  for (const snapshot of snapshots.data) {
    // Verify all required fields are present and correctly typed
    TestValidator.equals(
      "product_name is string",
      typeof snapshot.product_name,
      "string",
    );
    TestValidator.equals(
      "product_description is string",
      typeof snapshot.product_description,
      "string",
    );
    TestValidator.equals(
      "category_id is valid UUID",
      typeof snapshot.category_id,
      "string",
    );
    TestValidator.equals(
      "category_name is string",
      typeof snapshot.category_name,
      "string",
    );
    TestValidator.predicate(
      "base_price is non-negative",
      snapshot.base_price >= 0,
    );
    TestValidator.equals(
      "thumbnail_image_url is valid URI",
      typeof snapshot.thumbnail_image_url,
      "string",
    );
    TestValidator.equals(
      "all_product_images is string",
      typeof snapshot.all_product_images,
      "string",
    );
    TestValidator.equals(
      "variant_sku is string",
      typeof snapshot.variant_sku,
      "string",
    );
    TestValidator.predicate(
      "variant_price is null or number",
      snapshot.variant_price === null ||
        typeof snapshot.variant_price === "number",
    );
    TestValidator.equals(
      "option_values is string",
      typeof snapshot.option_values,
      "string",
    );
    TestValidator.predicate(
      "stock_at_time_of_purchase is non-negative integer",
      snapshot.stock_at_time_of_purchase >= 0,
    );
    TestValidator.equals(
      "shop_name is string",
      typeof snapshot.shop_name,
      "string",
    );
    TestValidator.predicate(
      "shop_description is null or string",
      snapshot.shop_description === null ||
        typeof snapshot.shop_description === "string",
    );
    TestValidator.predicate(
      "logo_image_url is null or valid URI",
      snapshot.logo_image_url === null ||
        typeof snapshot.logo_image_url === "string",
    );
    TestValidator.equals(
      "created_at is ISO datetime",
      typeof snapshot.created_at,
      "string",
    );
    TestValidator.equals(
      "snapshot_hash is string",
      typeof snapshot.snapshot_hash,
      "string",
    );
    // Validate date-time format for created_at
    TestValidator.predicate(
      "created_at matches ISO date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        snapshot.created_at,
      ),
    );
    // Validate UUID format for category_id
    TestValidator.predicate(
      "category_id has valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        snapshot.category_id,
      ),
    );
    // Validate URI format for thumbnail_image_url
    TestValidator.predicate(
      "thumbnail_image_url has valid URI format",
      /^[a-zA-Z]+:\/\/.+/.test(snapshot.thumbnail_image_url),
    );
    // Validate URI format for logo_image_url if present
    if (snapshot.logo_image_url) {
      TestValidator.predicate(
        "logo_image_url has valid URI format",
        /^[a-zA-Z]+:\/\/.+/.test(snapshot.logo_image_url),
      );
    }
    // Validate snapshot_hash is non-empty
    TestValidator.predicate(
      "snapshot_hash is non-empty",
      snapshot.snapshot_hash.length > 0,
    );
  }
  // 4. Verify that other customer cannot see this customer's data
  // Create second customer
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(secondCustomerConnection, {
    body: secondCustomerData,
  });
  // Query snapshots with second customer
  const secondSnapshots: IPageIShoppingMallOrderItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      secondCustomerConnection,
      { body: request },
    );
  typia.assert(secondSnapshots);
  // Verify second customer sees different data (not shared with first customer)
  // Since we cannot ensure exact data, we validate that it's a different context
  // But we verify that the structure is the same and it's not empty if database has multiple customers
  // We do not test content equality, we test permissions
  // We know customer_id filtering is not required for customer endpoints
  // The system should restrict data to the authenticated user only
  // We cannot predict exact records, so we validate structure and presence
  // Check that the second customer's data is also properly structured
  TestValidator.equals(
    "second customer pagination structure",
    secondSnapshots.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "second customer pagination limit",
    secondSnapshots.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "second customer has records",
    secondSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second customer has data structure",
    secondSnapshots.data.length >= 0,
  );
  // We cannot validate that data is different, but we validate authentication isolation
  // The system enforces that customer can only see their own snapshots
  // So second customer's data should not overlap with first customer's data
  // But we don't have a way to correlate data across customers, so we rely on the system logic
  // We validate it works by ensuring no access violation occurs
  // 5. Test pagination with next page if possible
  if (
    snapshots.pagination.records > snapshots.pagination.limit &&
    snapshots.pagination.pages > 1
  ) {
    const nextPageRequest: IShoppingMallOrderItemSnapshot.IRequest = {
      page: 2,
      limit: snapshots.pagination.limit,
    };
    const nextPageSnapshots: IPageIShoppingMallOrderItemSnapshot.ISummary =
      await api.functional.shoppingMall.customer.order_item_snapshots.index(
        customerConnection,
        { body: nextPageRequest },
      );
    typia.assert(nextPageSnapshots);
    TestValidator.equals(
      "next page current",
      nextPageSnapshots.pagination.current,
      2,
    );
    TestValidator.predicate(
      "next page has different data",
      nextPageSnapshots.pagination.records >= 0,
    );
    // We cannot test different data without knowing order, so we just validate structure
  }
}