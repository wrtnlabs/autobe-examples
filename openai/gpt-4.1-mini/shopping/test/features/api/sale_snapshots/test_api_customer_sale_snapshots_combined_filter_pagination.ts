import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";

export async function test_api_customer_sale_snapshots_combined_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer user.
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = { Authorization: authorized.token.access };

  // 2. Prepare the custom filter object with combined criteria.
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filter = {
    category_id: null,
    base_price_min: 1000,
    base_price_max: 100000,
    created_at_min: thirtyDaysAgo.toISOString(),
    created_at_max: now.toISOString(),
    pagination: {
      current: 1,
      limit: 5,
    },
  };

  // 3. Call the PATCH /shoppingMall/customer/sale-snapshots endpoint with filter as body
  const response = await api.functional.shoppingMall.customer.sale_snapshots.index(
    customerConnection,
    { body: filter as any },
  );
  typia.assert(response);

  // 4. Validate pagination info is consistent
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page must be 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit must be 5", pagination.limit === 5);
  TestValidator.predicate(
    "pagination pages must be greater than or equal to current",
    pagination.pages >= pagination.current,
  );
  TestValidator.predicate(
    "pagination records must be greater than or equal to data length",
    pagination.records >= data.length,
  );

  // 5. Validate returned snapshots respect filter conditions that can be checked
  for (const snapshot of data) {
    if (filter.category_id !== null) {
      TestValidator.equals(
        "filter category_id if provided",
        (snapshot as any).category_id,
        filter.category_id,
      );
    }
    if (typeof (snapshot as any).base_price === "number") {
      TestValidator.predicate(
        "base_price_min",
        (snapshot as any).base_price >= (filter.base_price_min ?? 0),
      );
      if (filter.base_price_max !== undefined && filter.base_price_max !== null) {
        TestValidator.predicate(
          "base_price_max",
          (snapshot as any).base_price <= filter.base_price_max!,
        );
      }
    }
    if (typeof (snapshot as any).created_at === "string") {
      const createdAt = new Date((snapshot as any).created_at).getTime();
      const minDate = filter.created_at_min
        ? new Date(filter.created_at_min).getTime()
        : null;
      const maxDate = filter.created_at_max
        ? new Date(filter.created_at_max).getTime()
        : null;
      if (minDate !== null) {
        TestValidator.predicate("created_at_min", createdAt >= minDate);
      }
      if (maxDate !== null) {
        TestValidator.predicate("created_at_max", createdAt <= maxDate);
      }
    }
  }

  // 6. Test invalid filter and pagination values to verify rejections
  await TestValidator.error("negative pagination current throws", async () => {
    const invalidBody = {
      ...filter,
      pagination: { current: -1, limit: 5 },
    };
    await api.functional.shoppingMall.customer.sale_snapshots.index(
      customerConnection,
      { body: invalidBody },
    );
  });

  await TestValidator.error("invalid base price range throws", async () => {
    const invalidBody = {
      ...filter,
      base_price_min: 100000,
      base_price_max: 1000,
    };
    await api.functional.shoppingMall.customer.sale_snapshots.index(
      customerConnection,
      { body: invalidBody },
    );
  });

  await TestValidator.error("invalid created_at date range throws", async () => {
    const invalidBody = {
      ...filter,
      created_at_min: now.toISOString(),
      created_at_max: thirtyDaysAgo.toISOString(),
    };
    await api.functional.shoppingMall.customer.sale_snapshots.index(
      customerConnection,
      { body: invalidBody },
    );
  });
}
