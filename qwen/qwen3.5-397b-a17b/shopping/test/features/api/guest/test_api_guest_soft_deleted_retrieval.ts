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
 * Test administrator retrieval of guest account records including soft-deleted state validation.
 *
 * Validates that administrators can access guest account information through the admin endpoint with proper authentication. Since guest accounts are system-managed infrastructure created automatically during platform interactions, this test focuses on validating the endpoint structure, admin access capability, and response schema including the soft-delete tracking field.
 *
 * The deleted_at field is critical for soft-delete strategy - when populated with ISO datetime, it indicates the guest account has been archived while preserving historical data. When null, the account is active. This test validates the field exists and follows the expected nullable timestamp pattern for consistent soft-delete handling across the platform.
 *
 * 1. Administrator account created through promotion workflow using authorize_admin_join utility.
 * 2. Guest account retrieval attempted with UUID format guestId parameter.
 * 3. Response validated against IShoppingMallGuest structure including deleted_at field.
 * 4. Soft-delete field (deleted_at) verified as nullable timestamp for tracking archived guest records.
 */
export async function test_api_guest_soft_deleted_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account through promotion workflow
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve guest record by UUID
  // Guest accounts are system-managed infrastructure created automatically
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest = await api.functional.shoppingMall.admin.guests.at(
    adminConnection,
    {
      guestId,
    },
  );
  typia.assert(guest);
  // 3. Validate response structure and soft-delete field
  TestValidator.equals("guest ID matches request", guest.id, guestId);
  TestValidator.predicate(
    "device fingerprint exists as string",
    typeof guest.device_fingerprint === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or ISO datetime string for soft-delete tracking",
    guest.deleted_at === null || typeof guest.deleted_at === "string",
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof guest.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof guest.updated_at === "string",
  );
}
