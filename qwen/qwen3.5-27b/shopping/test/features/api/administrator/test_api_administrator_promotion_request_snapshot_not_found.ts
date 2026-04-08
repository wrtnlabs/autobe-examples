import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test attempting to view a non-existent administrator promotion request snapshot.
 *
 * Validates that the system properly returns a 404 Not Found error when an administrator attempts to access a promotion request snapshot that does not exist in the database. This ensures proper error handling for invalid resource references.
 *
 * The test verifies that the API correctly distinguishes between authentication errors and resource not found errors, ensuring that authenticated administrators receive appropriate 404 responses when requesting non-existent snapshots.
 *
 * 1. Administrator registers a new account with valid credentials.
 * 2. Administrator generates valid UUIDs for request and snapshot IDs that do not exist.
 * 3. Administrator attempts to retrieve the non-existent snapshot.
 * 4. Validates that a 404 HttpError is thrown with appropriate status code.
 */
export async function test_api_administrator_promotion_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Generate non-existent UUIDs
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent snapshot and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.promotion_requests.snapshots.at(
        adminConnection,
        {
          requestId,
          snapshotId,
        },
      ),
  );
}
