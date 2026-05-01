import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest retrieval by UUID after platform join.
 *
 * Validates that a guest record created through the join operation can be
 * successfully retrieved by its unique identifier. Ensures all guest fields
 * — id, fingerprint, created_at, and updated_at — match between the join
 * response and the dedicated retrieval endpoint response.
 *
 * The test also confirms that updated_at equals created_at on the first join,
 * since no subsequent interactions have occurred to update the timestamp.
 *
 * 1. Guest joins using authorize_guest_join, which creates or retrieves a
 *    guest record with a random device fingerprint and session context.
 * 2. The guest record is fetched by its UUID via the guests.at endpoint.
 * 3. All fields are validated for consistency, and the updated_at/created_at
 *    equality on first join is confirmed.
 */
export async function test_api_guest_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  // 2. Retrieve guest by ID
  const guest = await api.functional.communityHub.guests.at(guestConnection, {
    guestId: authorized.id,
  });
  typia.assert(guest);
  // 3. Validate
  TestValidator.equals("guest id matches", guest.id, authorized.id);
  TestValidator.equals(
    "fingerprint matches",
    guest.fingerprint,
    authorized.fingerprint,
  );
  TestValidator.equals(
    "created_at matches",
    guest.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    guest.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "updated_at equals created_at on first join",
    guest.updated_at,
    guest.created_at,
  );
}
