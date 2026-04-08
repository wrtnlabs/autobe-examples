import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_product_analytics_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve product analytics without filters
  const analytics =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Validate count relationships
  TestValidator.equals(
    "total_count equals active_count + deleted_count",
    analytics.data[0].total_count,
    analytics.data[0].active_count + analytics.data[0].deleted_count,
  );
  // 4. Validate price statistics are valid
  TestValidator.predicate(
    "average_price is non-negative",
    analytics.data[0].average_price >= 0,
  );
  TestValidator.predicate(
    "min_price is non-negative",
    analytics.data[0].min_price >= 0,
  );
  TestValidator.predicate(
    "max_price is non-negative",
    analytics.data[0].max_price >= 0,
  );
  TestValidator.predicate(
    "min_price should not exceed max_price",
    analytics.data[0].min_price <= analytics.data[0].max_price,
  );
  // 5. Validate category_distribution structure
  for (const category of analytics.data[0].category_distribution) {
    TestValidator.predicate(
      "category distribution has valid UUID",
      /^[0-9a-f-]{36}$/i.test(category.categoryId),
    );
    TestValidator.predicate(
      "category distribution has valid product count",
      category.productCount >= 0,
    );
  }
  // 6. Validate seller_distribution structure
  for (const seller of analytics.data[0].seller_distribution) {
    TestValidator.predicate(
      "seller distribution has valid product count",
      seller.productCount >= 0,
    );
    TestValidator.equals(
      "seller has valid approval status",
      seller.seller.approvalStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has valid suspension status",
      seller.seller.suspensionStatus !== undefined,
      true,
    );
  }
  // 7. Validate items structure if products exist
  for (const item of analytics.data[0].items) {
    TestValidator.predicate(
      "product item has valid UUID",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.predicate(
      "product item has non-negative base price",
      item.basePrice >= 0,
    );
    TestValidator.predicate(
      "product item has valid hasStock boolean",
      typeof item.hasStock === "boolean",
    );
  }
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination limit is positive",
    analytics.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    analytics.pagination.pages >= 0,
  );
  // 9. Validate items are sorted by createdAt descending (if items exist)
  if (analytics.data[0].items.length > 1) {
    for (let i = 0; i < analytics.data[0].items.length - 1; i++) {
      const current = new Date(analytics.data[0].items[i].createdAt).getTime();
      const next = new Date(analytics.data[0].items[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "items sorted by createdAt descending",
        current >= next,
      );
    }
  }
}