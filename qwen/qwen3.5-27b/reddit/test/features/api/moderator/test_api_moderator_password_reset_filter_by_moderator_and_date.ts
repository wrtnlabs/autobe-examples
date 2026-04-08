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
 * Test filtering password reset tokens by moderator ID and date range.
 *
 * Validates the password reset token listing functionality with various filter combinations including moderator ID, date range, and status filters. Ensures that the filtering logic correctly retrieves only the relevant password reset tokens based on the specified criteria.
 *
 * Special attention is given to verifying that moderator-specific filtering works correctly, date range filtering returns tokens within the specified boundaries, and multiple filters can be combined effectively. Pagination behavior is also validated with filters applied.
 *
 * 1. Authenticate as moderator1 using /auth/moderator/join
 * 2. Authenticate as moderator2 using /auth/moderator/join
 * 3. Authenticate as moderator3 using /auth/moderator/join
 * 4. Retrieve password reset tokens filtered by moderator1's ID
 * 5. Verify the response structure is valid and filtering is accepted
 * 6. Retrieve tokens filtered by date range (created_at_from to created_at_to)
 * 7. Verify the date range filters are accepted and response is valid
 * 8. Retrieve tokens with combined filters (moderator_id + date range + status)
 * 9. Verify all filters are accepted and response structure is correct
 * 10. Verify pagination metadata is accurate with filters applied
 */
export async function test_api_moderator_password_reset_filter_by_moderator_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator1
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_moderator_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator1);
  // 2. Authenticate as moderator2
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_moderator_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator2);
  // 3. Authenticate as moderator3
  const moderator3Connection: api.IConnection = { host: connection.host };
  const moderator3 = await authorize_moderator_join(moderator3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator3);
  // 4. Retrieve password reset tokens filtered by moderator1's ID
  const filteredByModerator =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderator1Connection,
      {
        body: {
          moderator_id: moderator1.id,
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(filteredByModerator);
  // 5. Verify the response structure is valid and filtering is accepted
  TestValidator.predicate(
    "filtered response has valid pagination",
    filteredByModerator.pagination.current >= 1 &&
      filteredByModerator.pagination.limit > 0,
  );
  TestValidator.equals(
    "data is an array",
    Array.isArray(filteredByModerator.data),
    true,
  );
  // 6. Retrieve tokens filtered by date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const filteredByDateRange =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderator1Connection,
      {
        body: {
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // 7. Verify the date range filters are accepted and response is valid
  TestValidator.predicate(
    "date range filtered response has valid pagination",
    filteredByDateRange.pagination.current >= 1 &&
      filteredByDateRange.pagination.limit > 0,
  );
  // 8. Retrieve tokens with combined filters (moderator_id + date range + status)
  const combinedFilters =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderator1Connection,
      {
        body: {
          moderator_id: moderator1.id,
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: now.toISOString(),
          status: "active",
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 9. Verify all filters are accepted and response structure is correct
  TestValidator.predicate(
    "combined filters response has valid pagination",
    combinedFilters.pagination.current >= 1 &&
      combinedFilters.pagination.limit > 0,
  );
  TestValidator.equals(
    "combined filters data is an array",
    Array.isArray(combinedFilters.data),
    true,
  );
  // Verify any returned tokens have correct structure
  for (const token of combinedFilters.data) {
    // Verify moderator_id filter would be applied (if tokens exist)
    TestValidator.equals(
      "token belongs to filtered moderator",
      token.moderator.id,
      moderator1.id,
    );
    // Verify date range filter would be applied (if tokens exist)
    const tokenCreated = new Date(token.created_at);
    TestValidator.predicate(
      "token created within date range",
      tokenCreated >= oneHourAgo && tokenCreated <= now,
    );
    // Verify status filter would be applied (if tokens exist)
    const tokenExpires = new Date(token.expires_at);
    TestValidator.predicate("token status matches filter", tokenExpires > now);
  }
  // 10. Verify pagination metadata is accurate with filters applied
  TestValidator.predicate(
    "pagination records count is non-negative",
    combinedFilters.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    combinedFilters.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    combinedFilters.data.length <= combinedFilters.pagination.limit,
  );
}
