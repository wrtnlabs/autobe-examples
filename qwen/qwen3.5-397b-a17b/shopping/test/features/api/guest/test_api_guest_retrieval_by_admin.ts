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
 * Test administrator retrieval of guest account record by ID.
 *
 * Validates the administrative guest account lookup functionality by testing the complete authentication and retrieval flow. Ensures that administrators can access guest account information including device fingerprint and session metadata through the dedicated admin endpoint.
 *
 * The test verifies that the response contains all required fields per the IShoppingMallGuest DTO specification: id (UUID format), device_fingerprint (string), created_at (ISO datetime), updated_at (ISO datetime), and deleted_at (nullable ISO datetime). This validates the primary success path for administrative guest account lookup.
 *
 * 1. Administrator account created through promotion workflow with randomized credentials.
 * 2. Guest account ID generated for retrieval test.
 * 3. GET endpoint called with admin authentication and guest UUID.
 * 4. Response validated against IShoppingMallGuest structure using typia.assert().
 */
export async function test_api_guest_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account through promotion workflow
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate guest ID for retrieval
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve guest account by ID
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.admin.guests.at(adminConnection, {
      guestId: guestId,
    });
  typia.assert(guest);
}
