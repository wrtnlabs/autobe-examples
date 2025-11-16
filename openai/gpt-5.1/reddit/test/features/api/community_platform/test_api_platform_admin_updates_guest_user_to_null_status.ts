import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_updates_guest_user_to_null_status(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated session
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a concrete account status definition as platformAdmin
  const statusBody = {
    key: RandomGenerator.alphabets(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Initialize a guest user record to have a non-null account_status_id
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const initialUpdateBody = {
    anonymous_handle: RandomGenerator.name(1),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    account_status_id: createdStatus.id,
  } satisfies ICommunityPlatformGuestuser.IUpdate;

  const beforeGuest: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId,
        body: initialUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformGuestuser>(beforeGuest);

  // Sanity checks on the before snapshot: it should reflect the status we set
  TestValidator.equals(
    "beforeGuest.id should match guestUserId",
    beforeGuest.id,
    guestUserId,
  );
  TestValidator.equals(
    "beforeGuest.account_status_id should equal createdStatus.id",
    beforeGuest.account_status_id ?? null,
    createdStatus.id,
  );

  // Capture important baseline fields for later comparison
  const beforeAnonymous = beforeGuest.anonymous_handle ?? null;
  const beforeUserAgent = beforeGuest.user_agent;
  const beforeCreatedAt = beforeGuest.created_at;
  const beforeUpdatedAt = beforeGuest.updated_at;
  const beforeDeletedAt = beforeGuest.deleted_at ?? null;

  // 4. Perform the main scenario: clear the guest user's account status
  // Since IUpdate.account_status_id is optional and non-nullable in the type,
  // we rely on domain logic implied by the API: omitting the field in the
  // payload should allow business logic to clear or adjust status according to
  // rules. Here, we send no account_status_id and focus on verifying the
  // response semantics.
  const clearStatusBody = {
    // Explicitly omit account_status_id to trigger clearing behavior according
    // to backend rules; leave other mutable fields untouched.
  } satisfies ICommunityPlatformGuestuser.IUpdate;

  const afterGuest: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId,
        body: clearStatusBody,
      },
    );
  typia.assert<ICommunityPlatformGuestuser>(afterGuest);

  // 5. Validate post-conditions and field invariants

  // Identity remains the same
  TestValidator.equals(
    "afterGuest.id should remain the same as beforeGuest.id",
    afterGuest.id,
    beforeGuest.id,
  );

  // Anonymous handle preserved
  TestValidator.equals(
    "anonymous_handle should remain unchanged after clearing status",
    afterGuest.anonymous_handle ?? null,
    beforeAnonymous,
  );

  // User agent preserved
  TestValidator.equals(
    "user_agent should remain unchanged after clearing status",
    afterGuest.user_agent,
    beforeUserAgent,
  );

  // created_at unchanged
  TestValidator.equals(
    "created_at should remain unchanged after clearing status",
    afterGuest.created_at,
    beforeCreatedAt,
  );

  // updated_at should change and be >= previous timestamp (lexicographically for ISO strings)
  TestValidator.notEquals(
    "updated_at should be refreshed after clearing status",
    afterGuest.updated_at,
    beforeUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at should be chronologically after or equal to previous updated_at",
    afterGuest.updated_at >= beforeUpdatedAt,
  );

  // deleted_at invariant
  TestValidator.equals(
    "deleted_at should remain unchanged after clearing status",
    afterGuest.deleted_at ?? null,
    beforeDeletedAt,
  );

  // Status association semantics: account_status_id should now be null-ish and
  // embedded account_status summary should no longer be present.
  TestValidator.equals(
    "account_status_id should be cleared (null) after update",
    afterGuest.account_status_id ?? null,
    null,
  );

  TestValidator.predicate(
    "account_status summary should be absent or null after clearing status",
    afterGuest.account_status === undefined ||
      afterGuest.account_status === null,
  );
}
