import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a valid active guest account by UUID.
 *
 * Validates the guest account retrieval endpoint by fetching an active guest account and verifying that all expected fields are present with correct data types. Ensures security by confirming the password_hash field is excluded from the response, and validates that the account is active (deleted_at is NULL). The test uses randomly generated guest IDs that will be simulated to return valid guest data.
 *
 * Special attention is given to verifying that the deleted_at field is NULL for active accounts, all timestamp fields use ISO 8601 format, and sensitive authentication data is never exposed through the API.
 *
 * 1. Generate a random UUID for a guest account to retrieve.
 * 2. Call the GET /redditCommunity/guests/{guestId} endpoint to fetch the guest account.
 * 3. Validate the response structure and data types using typia.assert().
 * 4. Verify that deleted_at is NULL (active account, not soft deleted).
 * 5. Ensure password_hash is never included in the response (security check).
 */
export async function test_api_guest_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random UUID for guest account retrieval
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve the guest account
  const guest = await api.functional.redditCommunity.guests.at(connection, {
    guestId,
  });
  typia.assert(guest);
  // 3. Verify deleted_at is NULL (active account, not soft deleted)
  TestValidator.equals(
    "deleted_at should be NULL for active account",
    guest.deleted_at,
    null,
  );
  // 4. Security check: ensure password_hash is never included in response
  const hasPasswordHash = "password_hash" in guest;
  TestValidator.predicate(
    "password_hash should never be included for security",
    hasPasswordHash === false,
  );
}
