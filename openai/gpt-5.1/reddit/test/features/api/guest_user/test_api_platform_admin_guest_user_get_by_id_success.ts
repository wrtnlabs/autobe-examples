import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_guest_user_get_by_id_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that subsequent
  //    platformAdmin endpoints can be called on this connection.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/platform-admin/join",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a concrete account status definition that could be associated
  //    with guest users. Even though we cannot wire it to a specific guest
  //    through available APIs, this validates the account status creation
  //    contract and ensures that ICommunityPlatformAccountStatus is usable in
  //    this environment.
  const accountStatusBody = {
    key: `GUEST_STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: "Guest Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.predicate(
    "created account status label should be non-empty",
    createdStatus.label.length > 0,
  );

  // 3. Retrieve a guest user by UUID. In real non-simulate runs, this UUID
  //    must correspond to an existing guest record. As we do not have an API
  //    to create or list guest users, and this test is primarily a contract
  //    test, we rely on simulator mode or pre-seeded data in real
  //    environments.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const guest: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.platformAdmin.guestUsers.at(
      connection,
      {
        guestUserId,
      },
    );
  typia.assert(guest);

  // Contract-level validations via typia.assert are already exhaustive. Here
  // we add a few business-oriented predicates.

  TestValidator.predicate(
    "guest.id should be a non-empty string",
    guest.id.length > 0,
  );

  TestValidator.predicate(
    "guest.user_agent should be a non-empty string",
    guest.user_agent.length > 0,
  );

  TestValidator.predicate(
    "guest.created_at should be a non-empty ISO date-time string",
    guest.created_at.length > 0,
  );

  TestValidator.predicate(
    "guest.updated_at should be a non-empty ISO date-time string",
    guest.updated_at.length > 0,
  );

  if (guest.account_status !== undefined) {
    // Validate the summary object using typia.assert and some additional
    // business semantics.
    typia.assert<ICommunityPlatformAccountStatus.ISummary>(
      guest.account_status,
    );

    TestValidator.predicate(
      "guest.account_status.id should be a non-empty UUID string",
      guest.account_status.id.length > 0,
    );

    TestValidator.predicate(
      "guest.account_status.key should be a non-empty string",
      guest.account_status.key.length > 0,
    );

    TestValidator.predicate(
      "guest.account_status.code should be a non-empty string",
      guest.account_status.code.length > 0,
    );

    TestValidator.predicate(
      "guest.account_status.label should be a non-empty string",
      guest.account_status.label.length > 0,
    );

    TestValidator.predicate(
      "guest.account_status.description should be a non-empty string",
      guest.account_status.description.length > 0,
    );
  }
}
