import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_community_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator registers and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "password123",
        href: `https://example.com/join?email=${moderatorEmail}`,
        referrer: "https://example.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Create a new community by the moderator
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  const createBody = {
    name: communityName,
    description: "Test community created for deletion workflow",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: createBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "Community name should be equal",
    community.name,
    communityName,
  );

  // 3. Moderator deletes the community
  await api.functional.redditCommunity.moderator.communities.erase(connection, {
    communityName,
  });

  // 4. Validate the community no longer exists
  // Since no direct API to verify non-existence, attempt to delete again should fail
  await TestValidator.error(
    "Deleting already deleted community should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.erase(
        connection,
        {
          communityName,
        },
      );
    },
  );
}
