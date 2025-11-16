import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_updates_guest_user_status_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create a new account status the guest user will be updated to reference
  const statusCreateBody = {
    key: `GUEST_RESTRICTED_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: true,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Assume an existing guest user id (fixture/external setup)
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build guest user update payload referencing the new account status
  const newAnonymousHandle = RandomGenerator.alphaNumeric(16);
  const newUserAgent = `Mozilla/5.0 ${RandomGenerator.paragraph({
    sentences: 3,
  })}`;

  const guestUpdateBody = {
    anonymous_handle: newAnonymousHandle,
    account_status_id: createdStatus.id,
    user_agent: newUserAgent,
  } satisfies ICommunityPlatformGuestuser.IUpdate;

  // 5. Execute the guest user update as the authenticated platform admin
  const updatedGuest: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId,
        body: guestUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformGuestuser>(updatedGuest);

  // 6. Validate updated fields and account status linkage
  TestValidator.equals(
    "guest user anonymous_handle should reflect updated value",
    updatedGuest.anonymous_handle,
    newAnonymousHandle,
  );

  TestValidator.equals(
    "guest user user_agent should reflect updated value",
    updatedGuest.user_agent,
    newUserAgent,
  );

  TestValidator.equals(
    "guest user account_status_id should match created account status id",
    updatedGuest.account_status_id,
    createdStatus.id,
  );

  TestValidator.predicate(
    "guest user account_status summary should be present after update",
    updatedGuest.account_status !== undefined,
  );

  if (updatedGuest.account_status !== undefined) {
    TestValidator.equals(
      "guest user account_status.id should match created status id",
      updatedGuest.account_status.id,
      createdStatus.id,
    );

    TestValidator.equals(
      "guest user account_status.key should match created status key",
      updatedGuest.account_status.key,
      createdStatus.key,
    );

    TestValidator.equals(
      "guest user account_status.label should match created status label",
      updatedGuest.account_status.label,
      createdStatus.label,
    );

    TestValidator.equals(
      "guest user account_status.isLoginAllowed should match created status flag",
      updatedGuest.account_status.isLoginAllowed,
      createdStatus.isLoginAllowed,
    );

    TestValidator.equals(
      "guest user account_status.isPostingAllowed should match created status flag",
      updatedGuest.account_status.isPostingAllowed,
      createdStatus.isPostingAllowed,
    );

    TestValidator.equals(
      "guest user account_status.isVotingAllowed should match created status flag",
      updatedGuest.account_status.isVotingAllowed,
      createdStatus.isVotingAllowed,
    );

    TestValidator.equals(
      "guest user account_status.requiresManualReview should match created status flag",
      updatedGuest.account_status.requiresManualReview,
      createdStatus.requiresManualReview,
    );
  }

  // 7. Basic temporal sanity check: created_at should not be after updated_at
  const createdAt = new Date(updatedGuest.created_at);
  const updatedAt = new Date(updatedGuest.updated_at);

  TestValidator.predicate(
    "guest user created_at should be less than or equal to updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );
}
