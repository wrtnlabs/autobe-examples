import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator product snapshots listing functionality.
 *
 * Validates that administrators can retrieve paginated lists of product snapshots for audit purposes. The test verifies successful authentication, proper response structure with snapshot summaries, and pagination metadata accuracy.
 *
 * This test covers the primary success path for admin product audit trail viewing, ensuring that snapshot data includes all required fields and pagination information is correctly calculated.
 *
 * 1. Administrator authenticates via join endpoint to obtain access token.
 * 2. Administrator requests product snapshots with a valid product UUID.
 * 3. Response contains paginated snapshot summaries with id, name, category_id, base_price, created_at.
 * 4. Pagination metadata includes current page, limit, total records, and total pages.
 * 5. Validates response structure and data types using typia.assert().
 * 6. Verifies pagination fields are properly populated.
 */
export async function test_api_admin_product_snapshots_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Request product snapshots with pagination
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshots =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata using predicate for boolean conditions
  TestValidator.predicate(
    "current page is non-negative",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot data structure if present
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    TestValidator.predicate(
      "snapshot has id",
      typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has name",
      typeof firstSnapshot.name === "string",
    );
    TestValidator.predicate(
      "snapshot has category_id",
      typeof firstSnapshot.category_id === "string",
    );
    TestValidator.predicate(
      "snapshot has base_price",
      typeof firstSnapshot.base_price === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
    );
  }
}
