import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest identity retrieval by UUID after a successful guest join.
 *
 * Validates that a guest identity created via the join endpoint can be retrieved
 * publicly without authentication. Ensures the retrieved identity contains all
 * required fields and that the id and fingerprint match the original join
 * response. Also verifies that the timestamps are logically consistent with
 * created_at occurring before or at the same time as updated_at.
 *
 * 1. Create a guest identity via authorize_guest_join with randomized credentials.
 * 2. Extract the guest id from the authorized response.
 * 3. Retrieve the guest identity publicly using the base connection.
 * 4. Validate id and fingerprint match the join response.
 * 5. Validate created_at and updated_at are non-empty ISO 8601 strings with
 *    created_at ≤ updated_at.
 */
export async function test_api_guest_identity_retrieval_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest identity via join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Retrieve guest identity publicly (no authentication required)
  const guest = await api.functional.todoApp.guests.at(connection, {
    guestId: authorized.id,
  });
  typia.assert(guest);
  // 3. Validate identity fields match join response
  TestValidator.equals("guest id matches", guest.id, authorized.id);
  TestValidator.equals(
    "guest fingerprint matches",
    guest.fingerprint,
    authorized.fingerprint,
  );
  // 4. Validate timestamp logic
  const createdAt = new Date(guest.created_at);
  const updatedAt = new Date(guest.updated_at);
  TestValidator.predicate(
    "created_at ≤ updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );
}
