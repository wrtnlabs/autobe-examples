import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that an authenticated platform administrator can retrieve a
 * credential-safe moderator summary by UUID.
 *
 * Business goals:
 *
 * - Ensure platform admin authentication via join endpoint is sufficient to
 *   access moderator detail API.
 * - Verify that the moderator detail endpoint returns data conforming to
 *   ICommunityPlatformCommunityModerator.ISummary, including nested
 *   account_status.
 * - Confirm that the payload is credential-safe (no password_hash field is
 *   exposed) by relying on the DTO contract.
 * - Verify that unauthenticated calls to the moderator detail endpoint fail.
 *
 * Test steps:
 *
 * 1. Register and authenticate a platform administrator using
 *    api.functional.auth.platformAdmin.join with a random IJoin payload.
 *
 *    - Rely on SDK to inject Authorization header into the shared connection.
 *    - Assert the returned ICommunityPlatformPlatformadmin.IAuthorized using
 *         typia.assert.
 * 2. Create a new account status using
 *    api.functional.communityPlatform.platformAdmin.accountStatuses.create with
 *    a realistic ICommunityPlatformAccountStatus.ICreate payload.
 *
 *    - Assert the created ICommunityPlatformAccountStatus using typia.assert.
 *    - Although we cannot link this exact status to a moderator (no moderator
 *         creation API), this step validates that prerequisite master data can
 *         be created under platform admin context.
 * 3. Call api.functional.communityPlatform.platformAdmin.communityModerators.at
 *    with a randomly generated UUID (typia.random<string &
 *    tags.Format<"uuid">>()).
 *
 *    - This exercises the target endpoint under an authenticated platformAdmin
 *         connection.
 *    - Capture the response as ICommunityPlatformCommunityModerator.ISummary and
 *         assert its type with typia.assert.
 * 4. Perform business-level assertions on the moderator summary:
 *
 *    - Id is a non-empty UUID string (already validated by typia.assert, but we can
 *         still check it is not empty).
 *    - Username is non-empty.
 *    - Email is non-empty and typia.assert has already validated email format.
 *    - Account_status is present and has non-empty id/key/label/code fields.
 *    - Created_at and updated_at are non-empty ISO date-time strings.
 *    - Is_deleted is a boolean. These checks use TestValidator.predicate and
 *         TestValidator.equals where meaningful, without re-implementing type
 *         checks covered by typia.
 * 5. Validate that unauthenticated access is rejected:
 *
 *    - Create a shallow-cloned connection with `headers: {}` to simulate an
 *         unauthenticated client.
 *    - Wrap a call to the same communityModerators.at (with another random UUID) in
 *         await TestValidator.error, expecting the call to fail for lack of
 *         authorization.
 *
 * Notes and constraints:
 *
 * - We cannot guarantee that the random UUID corresponds to an existing
 *   moderator, but in simulation mode the SDK will still return a valid
 *   ICommunityPlatformCommunityModerator.ISummary. In a real environment this
 *   test would need a fixture or dedicated moderator creation API; since no
 *   such API is available in the provided SDK list, we focus on type and
 *   authorization behavior.
 * - We must not manipulate connection.headers directly beyond creating a fresh
 *   unauthenticated connection object; the join function is solely responsible
 *   for attaching the Authorization token on the main connection.
 */
export async function test_api_platform_admin_retrieves_moderator_details_by_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create an account status definition under platform admin context
  const statusBody = {
    key: "ACTIVE_MODERATOR",
    label: "Active moderator",
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

  // 3. Call moderator detail endpoint as authenticated platform admin
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();

  const moderatorSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId,
      },
    );
  typia.assert<ICommunityPlatformCommunityModerator.ISummary>(moderatorSummary);

  // 4. Business-level assertions on the moderator summary
  TestValidator.predicate(
    "moderator id should match requested UUID format (non-empty)",
    moderatorSummary.id.length > 0,
  );
  TestValidator.predicate(
    "moderator username should be non-empty",
    moderatorSummary.username.length > 0,
  );
  TestValidator.predicate(
    "moderator email should be non-empty",
    moderatorSummary.email.length > 0,
  );

  TestValidator.predicate(
    "account_status.id should be non-empty",
    moderatorSummary.account_status.id.length > 0,
  );
  TestValidator.predicate(
    "account_status.key should be non-empty",
    moderatorSummary.account_status.key.length > 0,
  );
  TestValidator.predicate(
    "account_status.code should be non-empty",
    moderatorSummary.account_status.code.length > 0,
  );
  TestValidator.predicate(
    "account_status.label should be non-empty",
    moderatorSummary.account_status.label.length > 0,
  );

  TestValidator.predicate(
    "moderator created_at should be non-empty",
    moderatorSummary.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderator updated_at should be non-empty",
    moderatorSummary.updated_at.length > 0,
  );

  // 5. Unauthenticated access must fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client should not access moderator detail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.at(
        unauthConnection,
        {
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
