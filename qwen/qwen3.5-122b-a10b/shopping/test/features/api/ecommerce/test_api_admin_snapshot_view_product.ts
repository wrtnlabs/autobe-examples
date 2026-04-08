import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing of product snapshot for audit purposes.
 *
 * Validates that administrators can retrieve historical product snapshot records to audit product information changes over time. The snapshot preserves the complete state of a product at a specific point in time, including all variant information, even if the product is later modified or deleted.
 *
 * This test ensures the snapshot system maintains accurate historical records for compliance verification, dispute resolution, and product change investigation. Administrators must be able to access any snapshot on the platform regardless of the product's current status.
 *
 * 1. Administrator authenticates with the system using admin credentials.
 * 2. System generates a valid snapshot ID for testing.
 * 3. Administrator requests the snapshot by its unique identifier.
 * 4. System returns the complete snapshot record with denormalized product data.
 * 5. Validates snapshot ID matches the requested identifier.
 */
export async function test_api_admin_snapshot_view_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Generate a valid snapshot ID for testing
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Request the snapshot by its unique identifier
  const snapshot: IEcommerceSellerSnapshot =
    await api.functional.ecommerce.admin.snapshots.at(adminConnection, {
      snapshotId,
    });
  typia.assert(snapshot);
  // 4. Validate business logic - snapshot ID matches requested ID
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
}
