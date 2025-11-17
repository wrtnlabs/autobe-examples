import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_report_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user joins (sign up) to get authentication
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "StrongPassword123!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Registered user creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: {
          communityName:
            RandomGenerator.alphabets(10)
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, "") || "testcommunity",
          displayName: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          imageUrl: null,
          isPrivate: false,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Registered user creates a post within that community
  const postBody = RandomGenerator.paragraph({ sentences: 10 });
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });

  // Generate a valid UUID for the post's reddit_community_community_id since community DTO lacks an id
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: {
          reddit_community_community_id: communityId,
          type: "text",
          title: postTitle,
          body: postBody,
          link_url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Registered user files a report referencing the post
  const reportReason = RandomGenerator.paragraph({ sentences: 4 });

  const postReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.create(
      connection,
      {
        body: {
          reason: reportReason,
          post_id: post.id,
        } satisfies IRedditCommunityPostReport.ICreate,
      },
    );
  typia.assert(postReport);

  // 5. Validate the report links to the post
  TestValidator.equals(
    "reported post ID matches",
    postReport.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "report reason matches",
    postReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "registered user ID matches report creator",
    postReport.reddit_community_registereduser_id,
    user.id,
  );
}
