import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that requesting an account status by a non-existent identifier results
 * in a clean, domain-oriented not-found style error without leaking internal
 * implementation details.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join.
 * 2. Optionally create a valid account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to confirm the catalog is
 *    operational and to have a known existing ID.
 * 3. Generate a random UUID string and ensure it does not equal the created status
 *    ID (if any), so it represents a non-existent accountStatusId for this
 *    test's scope.
 * 4. Call GET /communityPlatform/platformAdmin/accountStatuses/{accountStatusId}
 *    with that fake ID while authenticated as the platform admin.
 * 5. Assert that the call fails with an HttpError using TestValidator.error
 *    (focusing only on the existence of an error, not exact HTTP status
 *    codes).
 * 6. Inspect the HttpError.toJSON().message payload to ensure it does not contain
 *    obvious internal leakage markers such as raw SQL fragments, table names,
 *    or stack traces, but may contain domain-focused messaging like "Account
 *    status not found".
 */
export async function test_api_account_status_get_by_id_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
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

  // 2. Optionally create a valid account status to ensure system is operational
  const statusCreateBody = {
    key: `TEST_STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: false,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  // 3. Generate a random UUID that is different from the created status id
  const nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const targetId =
    nonExistingId === createdStatus.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistingId;

  // 4 & 5. Call GET with the non-existent ID and assert that an error is thrown
  await TestValidator.error(
    "non-existent accountStatusId must cause error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.at(
        connection,
        { accountStatusId: targetId },
      );
    },
  );

  // Additional manual error capture to validate message content without
  // violating TestValidator.error semantics.
  let capturedMessage: unknown = null;

  type HttpErrorLike = {
    toJSON: () => {
      message: unknown;
    };
  };

  try {
    await api.functional.communityPlatform.platformAdmin.accountStatuses.at(
      connection,
      { accountStatusId: targetId },
    );
  } catch (exp) {
    if (
      exp !== null &&
      typeof exp === "object" &&
      "toJSON" in exp &&
      typeof (exp as HttpErrorLike).toJSON === "function"
    ) {
      const json = (exp as HttpErrorLike).toJSON();
      capturedMessage = json.message;
    } else if (exp instanceof Error) {
      capturedMessage = exp.message;
    } else {
      capturedMessage = String(exp);
    }
  }

  // Ensure we actually captured some error message content
  await TestValidator.predicate(
    "error message should be captured",
    async () => capturedMessage !== null && capturedMessage !== undefined,
  );

  const messageText: string =
    typeof capturedMessage === "string"
      ? capturedMessage
      : JSON.stringify(capturedMessage);

  // 6 & 7. Verify that the error message does not obviously leak low-level
  // implementation details such as raw SQL, table names, or stack traces.
  const forbiddenFragments = [
    "SELECT ",
    "INSERT INTO",
    "UPDATE ",
    "DELETE FROM",
    "community_platform_account_statuses",
    " at ", // common stack trace pattern
    "Exception",
  ] as const;

  for (const fragment of forbiddenFragments) {
    TestValidator.predicate(
      `error message must not contain forbidden fragment: ${fragment}`,
      () => !messageText.includes(fragment),
    );
  }
}
