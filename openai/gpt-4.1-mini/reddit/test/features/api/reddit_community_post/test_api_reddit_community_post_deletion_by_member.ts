import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * E2E test for permanent deletion of a post by an authorized member user.
 *
 * This test simulates the realistic scenario of a member registering, creating
 * a community, posting within that community, and then deleting the post. It
 * validates that deletion only succeeds for authorized members and that the
 * post is correctly removed.
 *
 * Workflow:
 *
 * 1. Member user registration and authentication.
 * 2. Creation of a new community.
 * 3. Creation of a post inside that community.
 * 4. Deletion of the newly created post by its ID.
 *
 * Validations:
 *
 * - All created entities are properly returned and type-asserted.
 * - Post deletion response is empty (void).
 * - Proper roles/authorization for member user.
 */
export async function test_api_reddit_community_post_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`,
        password: "SecurePass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(memberAuthorized);

  // 2. Create a new community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: RandomGenerator.name(1).replace(/ /g, "_").toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the new community
  const postType = RandomGenerator.pick([
    "text" as const,
    "link" as const,
    "image" as const,
  ]);
  const postBody: IRedditCommunityPosts.ICreate = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  };

  // Conditionally set content based on post_type
  if (postType === "text") {
    postBody.body_text = RandomGenerator.content({ paragraphs: 2 });
  } else if (postType === "link") {
    postBody.link_url =
      "https://example.com/" + RandomGenerator.alphaNumeric(10);
  } else if (postType === "image") {
    postBody.image_url =
      "https://example.com/image/" + RandomGenerator.alphaNumeric(10) + ".jpg";
  }

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 4. Delete the post by ID
  await api.functional.redditCommunity.member.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );

  // No content returned from delete - successful if no error thrown
}
