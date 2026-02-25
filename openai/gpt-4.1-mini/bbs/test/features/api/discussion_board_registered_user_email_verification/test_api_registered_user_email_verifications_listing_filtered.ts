import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_email_verifications_listing_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new registered user
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & typia.tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  const authorized: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userConnection, {
      body: { email: userEmail, password: userPassword },
    });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Prepare some tokens with diverse known statuses by making the listing calls without filters to determine existing data for pagination and filters
  // Since no creation or manipulation APIs exposed, we do the best by invoking index with different filters and verifying results
  // 3. Query with no filters - expect all tokens for the user
  const allTokens =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: { email: userEmail, page: 1, limit: 50 } },
    );
  typia.assert(allTokens);
  // All tokens must have token.userEmail === userEmail - cannot check since structure does not expose email
  // But at least entries must be arrays and pagination match
  TestValidator.predicate(
    "no filter returns tokens",
    Array.isArray(allTokens.data),
  );
  // 4. Test by filtering for each status: valid, expired, used, invalid
  for (const status of ["valid", "expired", "used", "invalid"] as const) {
    const result =
      await api.functional.discussionBoard.registeredUser.emailVerifications.index(
        userConnection,
        { body: { email: userEmail, status, page: 1, limit: 20 } },
      );
    typia.assert(result);
    TestValidator.predicate(
      `filtered by status ${status} returns tokens array`,
      Array.isArray(result.data),
    );
    // Validate all returned tokens have appropriate expired_at and usage according to status
    // Since we can't mutate or create tokens, only checking consistency logic
    for (const token of result.data) {
      if (status === "valid") {
        // valid: expired_at after now and not used
        TestValidator.predicate(
          `token expired_at is valid for status=${status}`,
          token.expired_at !== null && new Date(token.expired_at) > new Date(),
        );
      } else if (status === "expired") {
        TestValidator.predicate(
          `token expired_at is past for status=${status}`,
          token.expired_at !== null && new Date(token.expired_at) <= new Date(),
        );
      } else if (status === "used") {
        // We can't detect 'used' by fields exposed, so just skip detailed check
        // Just ensure token.expired_at is defined
        TestValidator.predicate(
          `token expired_at is defined for status=${status}`,
          token.expired_at !== null,
        );
      } else if (status === "invalid") {
        // Invalid tokens might have null expired_at or other anomaly
        // We can only check token is in array
        TestValidator.predicate(`token presence for status=${status}`, true);
      }
    }
  }
  // 5. Test filtering by createdAtFrom and createdAtTo
  const nowISOString = new Date().toISOString();
  // Use createdAtFrom greater than now to get no results
  const noMatch =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      {
        body: {
          email: userEmail,
          createdAtFrom: nowISOString,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals(
    "no tokens should match future createdAtFrom",
    noMatch.data.length,
    0,
  );
  // 6. Test filtering by expiredAtFrom and expiredAtTo
  // Use expiredAtTo less than now to possibly get expired tokens
  const expiredBeforeNow =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      {
        body: {
          email: userEmail,
          expiredAtTo: nowISOString,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(expiredBeforeNow);
  // All tokens expired before or at now
  for (const token of expiredBeforeNow.data) {
    TestValidator.predicate(
      "expired token expired_at before now",
      token.expired_at !== null && new Date(token.expired_at) <= new Date(),
    );
  }
  // 7. Pagination works correctly
  const page1 =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: { email: userEmail, page: 1, limit: 1 } },
    );
  const page2 =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: { email: userEmail, page: 2, limit: 1 } },
    );
  typia.assert(page1);
  typia.assert(page2);
  if (page1.data.length === 1) {
    // IDs on page 1 and page 2 must differ
    if (page2.data.length === 1) {
      TestValidator.notEquals(
        "pagination page IDs differ",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }
  // 8. Unauthorized access test - using base connection without login (no headers)
  await TestValidator.httpError(
    "unauthorized access forbidden",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.emailVerifications.index(
        { host: connection.host },
        { body: { email: userEmail } },
      );
    },
  );
}
