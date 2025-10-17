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
 * Validate permanent deletion of a post by an authorized admin user.
 *
 * The test covers the entire workflow from admin creation, member creation,
 * community and post creation by member, to admin deleting the post. It ensures
 * proper authorization and successful deletion.
 *
 * Steps:
 *
 * 1. Register a new admin account and validate authorization token.
 * 2. Register a new member account for creating community and posts.
 * 3. Create a new community as the member.
 * 4. Create a new post in the community by the member.
 * 5. Authenticate as the admin and delete the post.
 * 6. Confirm deletion by absence of errors and proper API response.
 */
export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Member registration and authorization
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a community as member
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 })
      .replace(/\s/g, "_")
      .toLowerCase()
      .slice(0, 30),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Create a post in the community by member
  const postType = RandomGenerator.pick(["text", "link", "image"] as const);
  const postCreateBody: IRedditCommunityPosts.ICreate = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 20 }),
  };
  if (postType === "text") {
    postCreateBody.body_text = RandomGenerator.content({ paragraphs: 2 });
  } else if (postType === "link") {
    postCreateBody.link_url = `https://${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 }).replace(/\s/g, "")}.com`;
  } else if (postType === "image") {
    postCreateBody.image_url = `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`;
  }
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 5. Authenticate as admin to delete the post
  await api.functional.auth.admin.join(
    connection, // login again to renew admin token for clarity
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IRedditCommunityAdmin.ICreate,
    },
  );

  // 6. Delete the post as admin
  await api.functional.redditCommunity.admin.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );

  // No content to assert, success is no exception thrown
}
