import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

/**
 * Test retrieving snapshot history for a newly created category that has not been edited.
 *
 * Validates that the category snapshot history endpoint correctly returns an empty data array when a category has no modification history. An administrator creates a new category without making any subsequent edits, then queries the snapshot history endpoint. The response should contain an empty data array with pagination metadata indicating zero total records and zero pages.
 *
 * This test validates the edge case of categories with no audit trail, ensuring the endpoint handles this gracefully without errors.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Administrator creates a new category without subsequent edits.
 * 3. Administrator queries the snapshot history endpoint for the created category.
 * 4. Validates the response contains empty data array.
 * 5. Validates pagination metadata shows zero records and zero pages.
 */
export async function test_api_category_snapshot_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create a new category without edits
  const category = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Query snapshot history for the created category
  const snapshots =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate empty data array
  TestValidator.equals("snapshot history is empty", snapshots.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "total records is zero",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals("total pages is zero", snapshots.pagination.pages, 0);
}
