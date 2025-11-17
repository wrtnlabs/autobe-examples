import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityReport";

/**
 * Test unauthorized access to moderator reports endpoint.
 *
 * This test validates that regular users cannot access the moderator reports
 * interface. It creates a regular user account and attempts to access the
 * reports endpoint, verifying that the request is properly rejected. It also
 * tests that non-authenticated requests are rejected.
 *
 * Test flow:
 *
 * 1. Create a regular user account
 * 2. Attempt to access moderator reports endpoint as regular user (should fail)
 * 3. Attempt to access moderator reports endpoint without authentication (should
 *    fail)
 */
export async function test_api_moderator_reports_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Try to access moderator reports as a regular user (should fail)
  const reportRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityForumCommunityReport.IRequest;

  await TestValidator.error(
    "regular user cannot access moderator reports",
    async () =>
      await api.functional.communityForum.moderator.reports.index(connection, {
        body: reportRequest,
      }),
  );

  // Step 3: Try to access moderator reports without authentication (should fail)
  // Create a new connection without authentication
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot access moderator reports",
    async () =>
      await api.functional.communityForum.moderator.reports.index(
        unauthConnection,
        {
          body: reportRequest,
        },
      ),
  );
}
