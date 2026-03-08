import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoryAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoryAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_analytics_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test basic category analytics retrieval without filters
  const basicResponse =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(basicResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    basicResponse.pagination.pages >= 0,
  );
  // Validate response structure
  if (basicResponse.data.length > 0) {
    const firstCategory = basicResponse.data[0];
    typia.assert(firstCategory);
    TestValidator.predicate("category has id", firstCategory.id.length > 0);
    TestValidator.predicate("category has name", firstCategory.name.length > 0);
    TestValidator.predicate(
      "total_product_count non-negative",
      firstCategory.total_product_count >= 0,
    );
    TestValidator.predicate(
      "active_product_count non-negative",
      firstCategory.active_product_count >= 0,
    );
  }
  // 3. Test search filter on category name
  const searchResponse =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 4. Test parent_category_id filtering (if categories exist)
  if (basicResponse.data.length > 0) {
    const parentCategory = basicResponse.data[0];
    const parentFilterResponse =
      await api.functional.ecommerceMall.admin.analytics.categories.index(
        adminConnection,
        {
          body: {
            parent_category_id: parentCategory.id,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCategoryAnalytic.IRequest,
        },
      );
    typia.assert(parentFilterResponse);
  }
  // 5. Test date range filtering
  const now = new Date();
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          created_at_from: now.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 6. Test include_deleted parameter
  const includeDeletedResponse =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          include_deleted: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(includeDeletedResponse);
  // 7. Validate category analytics structure
  for (const category of basicResponse.data) {
    typia.assert(category);
    // Validate parent structure if exists
    if (category.parent !== null && category.parent !== undefined) {
      typia.assert(category.parent);
      TestValidator.predicate("parent has id", category.parent.id.length > 0);
      TestValidator.predicate(
        "parent has name",
        category.parent.name.length > 0,
      );
    }
  }
}