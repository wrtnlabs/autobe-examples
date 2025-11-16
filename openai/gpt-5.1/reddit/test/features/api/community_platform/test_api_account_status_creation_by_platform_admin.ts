import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_account_status_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a coherent ACTIVE_PREMIUM-like account status definition
  const statusKeyPrefix = "ACTIVE_PREMIUM_";
  const statusKeySuffix = RandomGenerator.alphaNumeric(8);
  const statusKey = `${statusKeyPrefix}${statusKeySuffix}`;

  const createBody = {
    key: statusKey,
    label: "Active - Premium Tier",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Validate that the returned status matches input fields
  TestValidator.equals(
    "created account status key should match input",
    createdStatus.key,
    createBody.key,
  );

  TestValidator.equals(
    "created account status label should match input",
    createdStatus.label,
    createBody.label,
  );

  // description is optional on both sides, but when provided it should match
  TestValidator.equals(
    "created account status description should match input",
    createdStatus.description ?? null,
    createBody.description ?? null,
  );

  TestValidator.equals(
    "created account status isLoginAllowed flag should match input",
    createdStatus.isLoginAllowed,
    createBody.isLoginAllowed,
  );

  TestValidator.equals(
    "created account status isPostingAllowed flag should match input",
    createdStatus.isPostingAllowed,
    createBody.isPostingAllowed,
  );

  TestValidator.equals(
    "created account status isVotingAllowed flag should match input",
    createdStatus.isVotingAllowed,
    createBody.isVotingAllowed,
  );

  TestValidator.equals(
    "created account status requiresManualReview flag should match input",
    createdStatus.requiresManualReview,
    createBody.requiresManualReview,
  );

  // 4. Validate temporal fields and ordering: updatedAt should not be before createdAt
  const createdAtMs = new Date(createdStatus.createdAt).getTime();
  const updatedAtMs = new Date(createdStatus.updatedAt).getTime();

  TestValidator.predicate(
    "createdAt should be a valid timestamp",
    Number.isFinite(createdAtMs),
  );

  TestValidator.predicate(
    "updatedAt should be a valid timestamp",
    Number.isFinite(updatedAtMs),
  );

  TestValidator.predicate(
    "updatedAt must be equal to or after createdAt",
    createdAtMs <= updatedAtMs,
  );
}
