import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform-admin view of community moderator detail with logical
 * deletion flag.
 *
 * Business focus:
 *
 * - Ensure a platform admin can authenticate via the join endpoint.
 * - Ensure platform admin can create an account status definition used across
 *   actors.
 * - Ensure the moderator detail endpoint returns a credential-safe moderator
 *   summary DTO that includes an `is_deleted` flag communicating logical
 *   deletion state derived from underlying deleted_at.
 *
 * Technical constraints:
 *
 * - We do not have APIs to create or logically delete community moderators, so we
 *   cannot deterministically hit a real deleted record. Instead, we rely on the
 *   SDK’s simulate mode (if enabled) to return a random
 *   ICommunityPlatformCommunityModerator.ISummary and validate its structure
 *   and semantics, including `is_deleted` being a boolean flag.
 * - In real backend environments, a random UUID may yield 404, but this test is
 *   written as a success-path contract test and focuses on DTO shape and
 *   business fields when a moderator summary is returned.
 */
export async function test_api_platform_admin_handles_logically_deleted_moderator_on_detail_view(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Validate that basic profile fields in the response match our input
  TestValidator.equals(
    "platform admin email should match join payload",
    admin.email,
    joinBody.email,
  );
  TestValidator.equals(
    "platform admin username should match join payload",
    admin.username,
    joinBody.username,
  );
  TestValidator.predicate(
    "platform admin token must contain access token string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create an account status definition usable by moderators and other actors
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active moderator status",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert(status);

  // Validate core fields of created status echo our request
  TestValidator.equals(
    "account status key should match request",
    status.key,
    statusBody.key,
  );
  TestValidator.equals(
    "account status label should match request",
    status.label,
    statusBody.label,
  );
  TestValidator.equals(
    "account status login allowed flag should match request",
    status.isLoginAllowed,
    statusBody.isLoginAllowed,
  );
  TestValidator.equals(
    "account status posting allowed flag should match request",
    status.isPostingAllowed,
    statusBody.isPostingAllowed,
  );
  TestValidator.equals(
    "account status voting allowed flag should match request",
    status.isVotingAllowed,
    statusBody.isVotingAllowed,
  );
  TestValidator.equals(
    "account status manual review flag should match request",
    status.requiresManualReview,
    statusBody.requiresManualReview,
  );

  // 3. Call moderator detail endpoint with a random UUID
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();

  const moderator: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId,
      },
    );
  typia.assert(moderator);

  // Business-level validations for the moderator summary DTO
  TestValidator.predicate(
    "moderator summary must expose same id type as path param (uuid string)",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.predicate(
    "moderator summary username should be non-empty",
    moderator.username.length > 0,
  );
  TestValidator.predicate(
    "moderator summary email must look like an email string",
    moderator.email.includes("@"),
  );

  // Validate that account_status summary object exists and carries permission flags
  TestValidator.predicate(
    "moderator account_status summary is present",
    moderator.account_status !== undefined &&
      moderator.account_status !== null &&
      typeof moderator.account_status.id === "string" &&
      moderator.account_status.id.length > 0,
  );
  TestValidator.predicate(
    "moderator account_status flags should be booleans",
    typeof moderator.account_status.isLoginAllowed === "boolean" &&
      typeof moderator.account_status.isPostingAllowed === "boolean" &&
      typeof moderator.account_status.isVotingAllowed === "boolean" &&
      typeof moderator.account_status.requiresManualReview === "boolean",
  );

  // Logical deletion contract: is_deleted must be a boolean flag clearly indicating deletion state
  TestValidator.predicate(
    "moderator summary must expose is_deleted boolean flag",
    typeof moderator.is_deleted === "boolean",
  );
}
