import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can partially update a guest user's
 * metadata fields without changing status or lifecycle fields.
 *
 * Business goal
 *
 * - Ensure that PUT /communityPlatform/platformAdmin/guestUsers/{guestUserId}
 *   honors partial update semantics on ICommunityPlatformGuestuser.IUpdate:
 *   when only metadata fields such as anonymous_handle and user_agent are
 *   provided, status-related and lifecycle fields remain stable while
 *   updated_at advances.
 *
 * Test flow
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated connection context.
 * 2. Perform an initial update call against a (simulated) guestUserId with a
 *    fully-populated ICommunityPlatformGuestuser.IUpdate payload to obtain a
 *    baseline ICommunityPlatformGuestuser snapshot. Since we do not have a
 *    dedicated create/read endpoint, this first update serves as our reference
 *    state for subsequent comparisons.
 * 3. Construct a second ICommunityPlatformGuestuser.IUpdate payload that only
 *    changes anonymous_handle and user_agent, leaving account_status_id
 *    undefined (omitted) so that the backend should preserve the prior status
 *    association.
 * 4. Call the update endpoint again with the same guestUserId and the
 *    metadata-only payload.
 * 5. Validate via typia.assert that the response is a well-formed
 *    ICommunityPlatformGuestuser.
 * 6. Using TestValidator, assert that:
 *
 *    - Anonymous_handle and user_agent differ from the baseline values and match the
 *         new payload.
 *    - Account_status_id is exactly the same as before.
 *    - Account_status summary (when defined) is deeply equal between baseline and
 *         updated snapshots (we accept null/undefined symmetry as equal via
 *         TestValidator.equals).
 *    - Created_at is identical (no change).
 *    - Updated_at is not equal to the baseline updated_at and is lexicographically
 *         greater than or equal to it as an ISO date-time string.
 *    - Deleted_at retains the same value (including null semantics) between baseline
 *         and updated snapshots.
 */
export async function test_api_platform_admin_partial_update_guest_user_metadata_only(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform admin via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Perform an initial update to obtain a baseline guest user snapshot.
  //    We must pass a UUID for guestUserId and a full update payload; this serves as our
  //    reference state since we do not have a dedicated create/read endpoint in this context.
  const guestUserId = typia.random<string & tags.Format<"uuid">>();

  const initialUpdateBody = {
    anonymous_handle: RandomGenerator.alphaNumeric(12),
    account_status_id: typia.random<string & tags.Format<"uuid">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformGuestuser.IUpdate;

  const baseline: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId,
        body: initialUpdateBody,
      },
    );
  typia.assert(baseline);

  // 3. Prepare a metadata-only update payload (no account_status_id) that changes
  //    anonymous_handle and user_agent.
  const newAnonymousHandle = RandomGenerator.alphaNumeric(14);
  const newUserAgent = RandomGenerator.paragraph({ sentences: 4 });

  const metadataOnlyBody = {
    anonymous_handle: newAnonymousHandle,
    user_agent: newUserAgent,
  } satisfies ICommunityPlatformGuestuser.IUpdate;

  // 4. Call update again with the same guestUserId and metadata-only payload.
  const updated: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId,
        body: metadataOnlyBody,
      },
    );
  typia.assert(updated);

  // 5. Type-level assurance already done via typia.assert; now verify business semantics.

  // 5-1. Metadata fields should be updated.
  TestValidator.equals(
    "anonymous_handle should be updated to new metadata value",
    updated.anonymous_handle ?? null,
    newAnonymousHandle,
  );
  TestValidator.equals(
    "user_agent should be updated to new metadata value",
    updated.user_agent,
    newUserAgent,
  );

  // 5-2. account_status_id must remain unchanged between baseline and updated snapshots.
  TestValidator.equals(
    "account_status_id should remain unchanged after metadata-only update",
    updated.account_status_id ?? null,
    baseline.account_status_id ?? null,
  );

  // 5-3. account_status summary (when materialized) should be stable.
  TestValidator.equals(
    "account_status summary should remain unchanged after metadata-only update",
    updated.account_status ?? null,
    baseline.account_status ?? null,
  );

  // 5-4. created_at must remain exactly the same.
  TestValidator.equals(
    "created_at should remain unchanged after metadata-only update",
    updated.created_at,
    baseline.created_at,
  );

  // 5-5. updated_at should change (newer than or at least different from baseline).
  TestValidator.notEquals(
    "updated_at should differ from baseline after update",
    updated.updated_at,
    baseline.updated_at,
  );

  // Additionally assert that updated.updated_at is not earlier than baseline.updated_at
  // when compared as ISO date-time strings.
  TestValidator.predicate(
    "updated_at should be lexicographically >= baseline.updated_at (ISO date-time)",
    updated.updated_at >= baseline.updated_at,
  );

  // 5-6. deleted_at should remain unchanged (including null semantics).
  TestValidator.equals(
    "deleted_at should remain unchanged after metadata-only update",
    updated.deleted_at ?? null,
    baseline.deleted_at ?? null,
  );
}
