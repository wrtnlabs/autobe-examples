import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering guest invitations by invitation status.
 *
 * Validates that the guest invitation listing endpoint correctly filters results by invitation status (pending, accepted, expired). Ensures that each status filter returns only invitations matching the specified status and that expired invitations have valid past expiration timestamps.
 *
 * 1. Filter by "pending" status and verify all results are pending
 * 2. Filter by "expired" status and verify all results are expired with past timestamps
 * 3. Filter by "accepted" status and verify all results are accepted
 */
export async function test_api_guest_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Filter by "pending" status
  const pendingResponse = await api.functional.hrmTimeTrack.guests.index(
    connection,
    {
      body: {
        status: "pending",
      } satisfies IHrmTimeTrackGuest.IRequest,
    },
  );
  typia.assert(pendingResponse);
  // Verify all returned invitations have status "pending"
  for (const guest of pendingResponse.data) {
    TestValidator.equals("pending status filter", guest.status, "pending");
  }
  // 2. Filter by "expired" status
  const expiredResponse = await api.functional.hrmTimeTrack.guests.index(
    connection,
    {
      body: {
        status: "expired",
      } satisfies IHrmTimeTrackGuest.IRequest,
    },
  );
  typia.assert(expiredResponse);
  // Verify all returned invitations have status "expired"
  for (const guest of expiredResponse.data) {
    TestValidator.equals("expired status filter", guest.status, "expired");
    // Verify expired invitations have expires_at timestamp in the past
    const expiresAt = new Date(guest.expires_at);
    const now = new Date();
    TestValidator.predicate(
      "expired invitation has past expiration timestamp",
      expiresAt < now,
    );
  }
  // 3. Filter by "accepted" status
  const acceptedResponse = await api.functional.hrmTimeTrack.guests.index(
    connection,
    {
      body: {
        status: "accepted",
      } satisfies IHrmTimeTrackGuest.IRequest,
    },
  );
  typia.assert(acceptedResponse);
  // Verify all returned invitations have status "accepted"
  for (const guest of acceptedResponse.data) {
    TestValidator.equals("accepted status filter", guest.status, "accepted");
  }
}
