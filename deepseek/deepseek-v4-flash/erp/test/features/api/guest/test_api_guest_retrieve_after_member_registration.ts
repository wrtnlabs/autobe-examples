import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a guest record after the guest transitions to a registered member.
 *
 * Validates that when a guest completes registration via the join endpoint, the original guest record is soft-deleted with a non-null deleted_at timestamp. The guest ID is extracted from the join response's sessions array, and the subsequent retrieval confirms the soft-delete status.
 *
 * 1. Register a guest via join endpoint (triggers guest-to-member transition and soft-deletes the guest record).
 * 2. Extract the guest ID from the join response's sessions[0].guest.id.
 * 3. Retrieve the guest record by its ID.
 * 4. Verify deleted_at is populated (non-null), confirming soft-delete.
 */
export async function test_api_guest_retrieve_after_member_registration(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Guest join (guest-to-member transition)
  //----
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  //----
  // 2. Extract guest ID from session
  //----
  const guestId: string = authorized.sessions[0].guest.id;
  //----
  // 3. Retrieve guest record after member registration
  //----
  const retrievalConnection: api.IConnection = { host: connection.host };
  const guest: IHrmTimeTrackingGuest =
    await api.functional.hrmTimeTracking.guests.at(retrievalConnection, {
      guestId,
    });
  typia.assert(guest);
  //----
  // 4. Verify guest is soft-deleted (deleted_at populated)
  //----
  TestValidator.predicate(
    "guest soft-deleted after member registration",
    guest.deleted_at !== null,
  );
}
