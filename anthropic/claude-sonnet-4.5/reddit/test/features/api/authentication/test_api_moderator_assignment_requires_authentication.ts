import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that moderator assignment requires proper authentication and cannot be
 * performed without valid credentials.
 *
 * This test validates the security enforcement of the moderator assignment
 * endpoint by attempting to assign a moderator without authentication
 * credentials and verifying that the request is properly rejected.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as first moderator
 * 2. Create a community as the authenticated moderator
 * 3. Create second moderator account to be assigned
 * 4. Create unauthenticated connection (remove Authorization header)
 * 5. Attempt to assign second moderator WITHOUT authentication
 * 6. Verify the request fails with authentication error
 */
export async function test_api_moderator_assignment_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as first moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: typia.random<string>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 2: Create a community as the authenticated moderator
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create second moderator account to be assigned
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: typia.random<string>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 4: Create unauthenticated connection (remove Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5 & 6: Attempt to assign moderator WITHOUT authentication and verify failure
  await TestValidator.error(
    "moderator assignment should fail without authentication",
    async () => {
      await api.functional.redditCommunity.moderator.communities.moderators.create(
        unauthConnection,
        {
          communityName: community.name,
          body: {
            email: moderator2Email,
            password: typia.random<string>(),
            nickname: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IRedditCommunityCommunityModerator.ICreate,
        },
      );
    },
  );
}
