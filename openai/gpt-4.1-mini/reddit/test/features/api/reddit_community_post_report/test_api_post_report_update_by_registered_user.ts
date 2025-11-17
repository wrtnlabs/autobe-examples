import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_post_report_update_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${typia.random<string & tags.Format<"email">>()}`,
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(user);

  // Step 2: Create a new reddit community
  const communityCreateBody: IRedditCommunityCommunity.ICreate = {
    communityName: `${RandomGenerator.alphabets(5)}`,
    displayName: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 7,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Step 3: Create a new post in the community
  const postCreateBody: IRedditCommunityPost.ICreate = {
    reddit_community_community_id:
      community.communityName satisfies string as string,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // Step 4: Create a post report for the post
  const postReportCreateBody: IRedditCommunityPostReport.ICreate = {
    post_id: post.id,
    reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
  } satisfies IRedditCommunityPostReport.ICreate;
  const postReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.create(
      connection,
      { body: postReportCreateBody },
    );
  typia.assert(postReport);

  // Step 5: Update the post report with a new reason
  const postReportUpdateBody: IRedditCommunityPostReport.IUpdate = {
    reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 6,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityPostReport.IUpdate;
  const updatedReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.update(
      connection,
      {
        postReportId: postReport.id,
        body: postReportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // Validate updated reason is reflected
  TestValidator.equals(
    "updated reason matches",
    updatedReport.reason,
    postReportUpdateBody.reason,
  );
}
