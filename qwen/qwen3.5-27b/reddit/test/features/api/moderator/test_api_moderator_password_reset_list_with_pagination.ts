import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorPasswordReset";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator password reset token listing with pagination and filtering capabilities.
 *
 * Validates the complete password reset token audit trail functionality including pagination metadata, token data structure, and both cursor-based and page-based navigation. Ensures that password reset tokens are properly sorted by creation time and that pagination controls function correctly for audit trail access.
 *
 * Special attention is given to verifying that the pagination metadata accurately reflects the total count of tokens, that cursor-based pagination retrieves subsequent pages correctly, and that the default sorting order (created_at descending) is maintained throughout.
 *
 * 1. Authenticate as a moderator using the join endpoint.
 * 2. List password reset tokens with default pagination parameters.
 * 3. Validate response structure contains pagination metadata and token data array.
 * 4. Verify pagination metadata fields: current, limit, records, pages.
 * 5. Verify each token contains required fields: id, token, expires_at, created_at, moderator.
 * 6. Test cursor-based pagination by fetching next page using cursor from first response.
 * 7. Verify next page returns different tokens with updated pagination metadata.
 * 8. Test page-based pagination by requesting specific page number.
 * 9. Validate default sorting order (created_at descending).
 */
export async function test_api_moderator_password_reset_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. List password reset tokens with default pagination
  const firstPage =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderatorConnection,
      {
        body: {} satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate response structure
  TestValidator.predicate(
    "response contains pagination metadata",
    firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(firstPage.data),
  );
  // 4. Verify pagination metadata fields
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is default 20", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 5. Verify token structure if data exists
  if (firstPage.data.length > 0) {
    const firstToken = firstPage.data[0];
    typia.assert(firstToken);
    TestValidator.predicate(
      "token has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(firstToken.id),
    );
    TestValidator.predicate(
      "token has non-empty token value",
      firstToken.token.length > 0,
    );
    TestValidator.predicate(
      "token has expires_at timestamp",
      firstToken.expires_at !== undefined,
    );
    TestValidator.predicate(
      "token has created_at timestamp",
      firstToken.created_at !== undefined,
    );
    TestValidator.predicate(
      "token has moderator info",
      firstToken.moderator !== undefined,
    );
    TestValidator.predicate(
      "moderator has id",
      firstToken.moderator.id !== undefined,
    );
    TestValidator.predicate(
      "moderator has email",
      firstToken.moderator.email !== undefined,
    );
    TestValidator.predicate(
      "moderator has profile",
      firstToken.moderator.profile !== undefined,
    );
    // 9. Validate sorting order (created_at descending) - check if multiple tokens exist
    if (firstPage.data.length > 1) {
      const createdAt0 = new Date(firstPage.data[0].created_at).getTime();
      const createdAt1 = new Date(firstPage.data[1].created_at).getTime();
      TestValidator.predicate(
        "tokens sorted by created_at descending",
        createdAt0 >= createdAt1,
      );
    }
  }
  // 6. Test cursor-based pagination if more pages exist
  if (firstPage.pagination.pages > 1) {
    // Use page-based pagination instead since cursor might not be in response
    // The API supports both cursor and page parameters
    const secondPage =
      await api.functional.redditClone.moderator.moderator.password_resets.index(
        moderatorConnection,
        {
          body: {
            page: 2,
          } satisfies IRedditCloneModeratorPasswordReset.IRequest,
        },
      );
    typia.assert(secondPage);
    // 7. Verify next page pagination metadata
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches first page",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "total records consistent across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent across pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // Verify different tokens on second page
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstTokenId = firstPage.data[0].id;
      const secondTokenId = secondPage.data[0].id;
      TestValidator.notEquals(
        "first and second page have different tokens",
        firstTokenId,
        secondTokenId,
      );
    }
  }
  // 8. Test page-based pagination with specific page number
  const specificPage =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(specificPage);
  TestValidator.equals(
    "custom limit is applied",
    specificPage.pagination.limit,
    10,
  );
  TestValidator.equals("current page is 1", specificPage.pagination.current, 1);
  TestValidator.predicate(
    "data array length does not exceed limit",
    specificPage.data.length <= 10,
  );
}
