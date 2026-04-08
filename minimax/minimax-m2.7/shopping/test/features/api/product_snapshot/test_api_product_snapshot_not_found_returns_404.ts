import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test that retrieving a non-existent product snapshot returns 404.
 *
 * This test validates the system's ability to handle missing snapshot requests gracefully.
 * An administrator attempts to retrieve a product snapshot using a valid UUID format
 * for both productId and snapshotId, but with a snapshotId that does not exist in the system.
 * The response should return HTTP 404 Not Found.
 */
export async function test_api_product_snapshot_not_found_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin join to create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Testing product snapshot retrieval functionality for administrative oversight.",
      href: "https://example.com/admin/products",
      referrer: "https://example.com/admin/dashboard",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Admin login to get authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "whatever", // Utility handles password internally for test account
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin/dashboard",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 3: Generate valid UUIDs - productId can be any valid UUID format
  // snapshotId is deliberately a non-existent UUID to trigger 404
  const productId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Verify that requesting non-existent snapshot returns 404
  await TestValidator.httpError(
    "non-existent product snapshot returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.products.snapshots.at(
        adminConnection,
        {
          productId,
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
