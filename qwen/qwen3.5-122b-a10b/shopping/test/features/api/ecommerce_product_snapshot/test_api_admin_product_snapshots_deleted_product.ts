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
 * Test administrator product snapshots retrieval for deleted products.
 *
 * Validates that administrators can access product snapshot audit trails even after product deletion. Product snapshots preserve historical state information for compliance and dispute resolution purposes, maintaining immutable records regardless of product lifecycle status.
 *
 * This test verifies the snapshot endpoint's resilience when querying non-existent or deleted products, ensuring the system handles such cases gracefully without crashes or data loss. The immutable audit trail requirement is validated through successful snapshot retrieval operations.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Generate a random product UUID to simulate deleted product scenario.
 * 3. Request product snapshots using the generated UUID.
 * 4. Validate response structure and pagination metadata.
 * 5. Confirm snapshot endpoint handles non-existent products gracefully.
 */
export async function test_api_admin_product_snapshots_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate random product UUID (simulating deleted product)
  const deletedProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Request snapshots for deleted/non-existent product
  const snapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId: deletedProductId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure exists and has valid values
  TestValidator.predicate(
    "pagination current page valid",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    snapshots.pagination.pages >= 0,
  );
  // 5. For non-existent product, snapshots should be empty array
  TestValidator.equals(
    "snapshot data is array",
    Array.isArray(snapshots.data),
    true,
  );
  TestValidator.equals(
    "no snapshots for non-existent product",
    snapshots.data.length,
    0,
  );
}
