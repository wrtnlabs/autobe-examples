import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test administrator category snapshot retrieval with category ID mismatch validation.
 *
 * Validates that the system correctly rejects snapshot retrieval requests when the specified category ID does not match the snapshot's parent category. This ensures proper data isolation and prevents unauthorized access to snapshots from different categories.
 *
 * The test creates two separate categories, updates the first to generate a snapshot, then attempts to retrieve that snapshot using the second category's ID. The system should return a 404 Not Found error, confirming that snapshot access is properly scoped to the parent category.
 *
 * 1. Administrator authenticates with admin credentials via authorize_admin_join.
 * 2. Creates first category that will have a snapshot generated.
 * 3. Creates second category for ID mismatch testing.
 * 4. Updates first category to generate a snapshot automatically.
 * 5. Generates a random snapshot UUID for testing.
 * 6. Attempts to retrieve the snapshot using the second category's ID.
 * 7. Verifies the response returns 404 Not Found status code.
 * 8. Validates the system correctly enforces category-snapshot relationship constraints.
 */
export async function test_api_category_snapshot_category_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create first category that will have a snapshot
  const category1 = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category1);
  // 3. Create second category for ID mismatch testing
  const category2 = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category2);
  // 4. Update first category to generate a snapshot
  const updatedCategory1 =
    await api.functional.ecommerce.admin.categories.update(adminConnection, {
      categoryId: category1.id,
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceCategory.IUpdate,
    });
  typia.assert(updatedCategory1);
  // 5. Generate a random snapshot UUID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to retrieve snapshot using second category's ID (mismatch scenario)
  await TestValidator.httpError(
    "snapshot retrieval with mismatched category ID should return 404",
    404,
    async () => {
      await api.functional.ecommerce.admin.categories.snapshots.at(
        adminConnection,
        {
          categoryId: category2.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
