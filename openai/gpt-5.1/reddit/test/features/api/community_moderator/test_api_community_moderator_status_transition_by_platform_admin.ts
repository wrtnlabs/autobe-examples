import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can transition a community moderator
 * between different account statuses and that the moderator summary reflects
 * the new status semantics and timestamps.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) which also authenticates and sets the
 *    Authorization header on the shared connection.
 * 2. As this platform admin, create two account statuses via the
 *    platformAdmin.accountStatuses.create endpoint:
 *
 *    - "allowed" status: all capability flags true, requiresManualReview false.
 *    - "blocked" status: all capability flags false, requiresManualReview true.
 * 3. Register a new community moderator via auth.communityModerator.join. (This
 *    will switch the Authorization header to the moderator token.)
 * 4. Log back in as the platform admin via auth.platformAdmin.login so that we
 *    hold an admin Authorization token again.
 * 5. Call communityModerators.update for the created moderator, setting the
 *    account_status_id to the "allowed" status id. Capture the returned
 *    ISummary, validate its type and that the embedded account_status summary
 *    matches the allowed status (id/key/label/boolean flags). Record the
 *    updated_at timestamp as a baseline.
 * 6. Call communityModerators.update again for the same moderator, this time
 *    setting account_status_id to the "blocked" status id. Capture the new
 *    ISummary and assert that:
 *
 *    - The account_status.id is now the blocked status id and differs from the
 *         allowed status id.
 *    - Key/label differ from the previous status and match the blocked status we
 *         created.
 *    - The boolean flags reflect the blocked configuration (all capabilities false,
 *         requiresManualReview true).
 *    - Updated_at has changed relative to the first summary, indicating that the
 *         update was persisted.
 */
export async function test_api_community_moderator_status_transition_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to obtain initial admin token
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create two account statuses: allowed and blocked
  const allowedStatusBody = {
    key: `ALLOWED_${RandomGenerator.alphaNumeric(8)}`,
    label: "Allowed Moderator",
    description: "Moderator is fully active; all capabilities enabled.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const allowedStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: allowedStatusBody },
    );
  typia.assert(allowedStatus);

  const blockedStatusBody = {
    key: `BLOCKED_${RandomGenerator.alphaNumeric(8)}`,
    label: "Blocked Moderator",
    description:
      "Moderator is blocked from login, posting, and voting; manual review required.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const blockedStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: blockedStatusBody },
    );
  typia.assert(blockedStatus);

  // 3. Register a new community moderator (this will switch Authorization)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.test.com` as string &
      tags.Format<"email">,
    password: "ModeratorPass!234",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.2",
    href: "https://community.app.local/mod/join" as string & tags.Format<"uri">,
    referrer: "https://community.app.local/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const communityModeratorId = moderatorAuthorized.id;

  // 4. Log back in as platform admin to regain admin Authorization
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.console.local/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. First status update: set moderator to allowed status
  const firstUpdateBody = {
    account_status_id: allowedStatus.id,
  } satisfies ICommunityPlatformCommunityModerator.IUpdate;

  const firstSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstSummary);

  // Validate that the account_status reflects the allowed configuration
  TestValidator.equals(
    "moderator account_status id matches allowed status id",
    firstSummary.account_status.id,
    allowedStatus.id,
  );
  TestValidator.equals(
    "moderator account_status key matches allowed status key",
    firstSummary.account_status.key,
    allowedStatus.key,
  );
  TestValidator.equals(
    "moderator account_status label matches allowed status label",
    firstSummary.account_status.label,
    allowedStatus.label,
  );
  TestValidator.equals(
    "allowed status permits login",
    firstSummary.account_status.isLoginAllowed,
    true,
  );
  TestValidator.equals(
    "allowed status permits posting",
    firstSummary.account_status.isPostingAllowed,
    true,
  );
  TestValidator.equals(
    "allowed status permits voting",
    firstSummary.account_status.isVotingAllowed,
    true,
  );
  TestValidator.equals(
    "allowed status does not require manual review",
    firstSummary.account_status.requiresManualReview,
    false,
  );

  const firstUpdatedAt = firstSummary.updated_at;

  // 6. Second status update: transition moderator to blocked status
  const secondUpdateBody = {
    account_status_id: blockedStatus.id,
  } satisfies ICommunityPlatformCommunityModerator.IUpdate;

  const secondSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondSummary);

  // Validate that the account_status now reflects the blocked configuration
  TestValidator.equals(
    "moderator account_status id matches blocked status id",
    secondSummary.account_status.id,
    blockedStatus.id,
  );
  TestValidator.notEquals(
    "blocked status id differs from allowed status id",
    secondSummary.account_status.id,
    allowedStatus.id,
  );
  TestValidator.equals(
    "moderator account_status key matches blocked status key",
    secondSummary.account_status.key,
    blockedStatus.key,
  );
  TestValidator.notEquals(
    "blocked status key differs from allowed status key",
    secondSummary.account_status.key,
    allowedStatus.key,
  );
  TestValidator.equals(
    "moderator account_status label matches blocked status label",
    secondSummary.account_status.label,
    blockedStatus.label,
  );
  TestValidator.notEquals(
    "blocked status label differs from allowed status label",
    secondSummary.account_status.label,
    allowedStatus.label,
  );
  TestValidator.equals(
    "blocked status disallows login",
    secondSummary.account_status.isLoginAllowed,
    false,
  );
  TestValidator.equals(
    "blocked status disallows posting",
    secondSummary.account_status.isPostingAllowed,
    false,
  );
  TestValidator.equals(
    "blocked status disallows voting",
    secondSummary.account_status.isVotingAllowed,
    false,
  );
  TestValidator.equals(
    "blocked status requires manual review",
    secondSummary.account_status.requiresManualReview,
    true,
  );

  // Ensure updated_at has advanced after the second update
  TestValidator.notEquals(
    "updated_at should change after account status transition",
    secondSummary.updated_at,
    firstUpdatedAt,
  );
}
