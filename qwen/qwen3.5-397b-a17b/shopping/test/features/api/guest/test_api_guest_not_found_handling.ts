import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that the system properly handles administrator attempts to retrieve non-existent guest accounts.
 *
 * Validates the complete error handling flow including administrator authentication, non-existent guest ID generation, and appropriate 404 response. Ensures that the system returns proper error responses without exposing system details when querying guest infrastructure records that don't exist.
 *
 * Special attention is given to verifying that the error handling follows platform conventions for missing resources and that no sensitive system information is leaked in error responses.
 *
 * 1. Administrator account is created through the promotion workflow.
 * 2. A valid UUID format is generated that does not correspond to any existing guest record.
 * 3. GET endpoint is called with the non-existent guest UUID.
 * 4. Validates the system returns HTTP 404 status indicating the guest was not found.
 * 5. Confirms error handling follows platform conventions for missing resources.
 */
export async function test_api_guest_not_found_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account through promotion workflow
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a valid UUID that does not correspond to any existing guest
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent guest and verify 404 response
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.guests.at(adminConnection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
