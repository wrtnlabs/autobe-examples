import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account retrieval by unique identifier.
 *
 * Validates the complete guest account lookup workflow including guest account creation via the join endpoint and subsequent retrieval using the guest ID. Ensures that the retrieved guest record contains all required fields with correct values matching the original join request.
 *
 * The test verifies that guest accounts can be successfully retrieved for anonymous content viewing sessions, with proper device fingerprint tracking and timestamp management.
 *
 * 1. Create a guest account using authorize_guest_join utility function with a unique device fingerprint.
 * 2. Extract the guest ID from the join response.
 * 3. Retrieve the guest account using api.functional.redditCommunity.guests.at with the guest ID.
 * 4. Validate the response structure with typia.assert().
 * 5. Verify that the retrieved guest ID matches the created guest ID.
 * 6. Verify that the device_fingerprint matches the one used during join.
 * 7. Verify that deleted_at is null for the active account.
 * 8. Verify that timestamps are valid ISO 8601 format.
 */
export async function test_api_guest_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account using utility function
  const guestJoinResult: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        deviceFingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(guestJoinResult);
  // 2. Extract guest ID
  const guestId: string & tags.Format<"uuid"> = guestJoinResult.id;
  // 3. Retrieve guest account using the guest ID
  const retrievedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.at(connection, {
      guestId: guestId,
    });
  typia.assert(retrievedGuest);
  // 4. Validate that retrieved guest ID matches created guest ID
  TestValidator.equals("guest ID matches", retrievedGuest.id, guestId);
  // 5. Validate that device fingerprint matches
  TestValidator.equals(
    "device fingerprint matches",
    retrievedGuest.device_fingerprint,
    guestJoinResult.device_fingerprint,
  );
  // 6. Validate that deleted_at is null for active account
  TestValidator.equals("deleted_at is null", retrievedGuest.deleted_at, null);
  // 7. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedGuest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedGuest.updated_at)),
  );
  // 8. Validate that updated_at is not before created_at
  TestValidator.predicate(
    "updated_at not before created_at",
    () =>
      new Date(retrievedGuest.updated_at).getTime() >=
      new Date(retrievedGuest.created_at).getTime(),
  );
}
