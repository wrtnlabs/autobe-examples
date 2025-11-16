import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Basic retrieval of a specific account status definition by ID for a platform
 * admin.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using the join endpoint to obtain an
 *    authenticated admin context.
 * 2. As that admin, create a new account status definition with a unique key and
 *    specific behavioral flags.
 * 3. Retrieve the created account status by its identifier using the GET-by-ID
 *    endpoint.
 * 4. Verify that all core fields (key, label, description, behavioral flags) match
 *    the original creation payload and that timestamps are consistent.
 */
export async function test_api_account_status_get_by_id_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated context.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1234",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new account status definition as the platform admin.
  const statusCreateBody = {
    key: `TEST_STATUS_${RandomGenerator.alphabets(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
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
  typia.assert(createdStatus);

  // 3. Retrieve the same account status by its ID.
  const fetchedStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.at(
      connection,
      {
        accountStatusId: createdStatus.id,
      },
    );
  typia.assert(fetchedStatus);

  // 4. Validate core field equality between created and fetched status.
  TestValidator.equals(
    "account status id should match between create and fetch",
    fetchedStatus.id,
    createdStatus.id,
  );

  TestValidator.equals(
    "account status key should match creation payload",
    fetchedStatus.key,
    statusCreateBody.key,
  );

  TestValidator.equals(
    "account status label should match creation payload",
    fetchedStatus.label,
    statusCreateBody.label,
  );

  TestValidator.equals(
    "account status description should match creation payload",
    fetchedStatus.description,
    statusCreateBody.description,
  );

  TestValidator.equals(
    "isLoginAllowed flag should match creation payload",
    fetchedStatus.isLoginAllowed,
    statusCreateBody.isLoginAllowed,
  );

  TestValidator.equals(
    "isPostingAllowed flag should match creation payload",
    fetchedStatus.isPostingAllowed,
    statusCreateBody.isPostingAllowed,
  );

  TestValidator.equals(
    "isVotingAllowed flag should match creation payload",
    fetchedStatus.isVotingAllowed,
    statusCreateBody.isVotingAllowed,
  );

  TestValidator.equals(
    "requiresManualReview flag should match creation payload",
    fetchedStatus.requiresManualReview,
    statusCreateBody.requiresManualReview,
  );

  // 5. Validate temporal consistency for createdAt and updatedAt.
  const createdAtMs = Date.parse(fetchedStatus.createdAt);
  const updatedAtMs = Date.parse(fetchedStatus.updatedAt);

  TestValidator.predicate(
    "createdAt should be a valid timestamp",
    Number.isFinite(createdAtMs) && createdAtMs > 0,
  );

  TestValidator.predicate(
    "updatedAt should be a valid timestamp",
    Number.isFinite(updatedAtMs) && updatedAtMs > 0,
  );

  TestValidator.predicate(
    "updatedAt should not be earlier than createdAt",
    updatedAtMs >= createdAtMs,
  );
}
