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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_analytics_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16)
      ),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple test categories
  const categories: IEcommerceMallCategory[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const category =
        await generate_random_ecommerce_mall_admin_categories_create(
          adminConnection,
          {
            body: {
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IEcommerceMallCategory.ICreate,
          },
        );
      typia.assert(category);
      return category;
    },
  );
  // 3. Query analytics with include_deleted=false (default)
  const activeOnlyResponse: IPageIEcommerceMallCategoryAnalytic.ISummary =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          include_deleted: false,
          limit: 100,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(activeOnlyResponse);
  // 4. Query analytics with include_deleted=true
  const withDeletedResponse: IPageIEcommerceMallCategoryAnalytic.ISummary =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          include_deleted: true,
          limit: 100,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(withDeletedResponse);
  // 5. Validate that all created categories appear in both queries
  // (since they are not deleted, they should appear in both)
  TestValidator.equals(
    "active categories count matches",
    activeOnlyResponse.data.length,
    withDeletedResponse.data.length,
  );
  // 6. Validate that created categories appear in results
  for (const createdCategory of categories) {
    const foundInActive = activeOnlyResponse.data.find(
      (c) => c.id === createdCategory.id,
    );
    const foundInWithDeleted = withDeletedResponse.data.find(
      (c) => c.id === createdCategory.id,
    );
    TestValidator.predicate(
      `category ${createdCategory.id} found in active-only query`,
      foundInActive !== undefined,
    );
    TestValidator.predicate(
      `category ${createdCategory.id} found in with-deleted query`,
      foundInWithDeleted !== undefined,
    );
    // 7. Validate deleted_at field is null for active categories
    TestValidator.equals(
      `category ${createdCategory.id} deleted_at is null`,
      foundInActive!.deleted_at,
      null,
    );
    TestValidator.equals(
      `category ${createdCategory.id} deleted_at is null in with-deleted query`,
      foundInWithDeleted!.deleted_at,
      null,
    );
  }
  // 8. Validate analytics response structure
  TestValidator.predicate(
    "pagination current is positive",
    activeOnlyResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    activeOnlyResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    activeOnlyResponse.pagination.records >= 0,
  );
  // 9. Validate category analytic summary structure
  if (activeOnlyResponse.data.length > 0) {
    const firstCategory = activeOnlyResponse.data[0];
    TestValidator.predicate(
      "category has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstCategory.id,
      ),
    );
    TestValidator.predicate(
      "category has non-empty name",
      firstCategory.name.length > 0,
    );
    TestValidator.predicate(
      "total_product_count is non-negative",
      firstCategory.total_product_count >= 0,
    );
    TestValidator.predicate(
      "active_product_count is non-negative",
      firstCategory.active_product_count >= 0,
    );
    TestValidator.predicate(
      "active_product_count <= total_product_count",
      firstCategory.active_product_count <= firstCategory.total_product_count,
    );
  }
}