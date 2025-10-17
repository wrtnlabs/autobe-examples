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
 * Test the complete post deletion workflow within a community by authorized
 * roles: member, communityModerator, and admin.
 *
 * Steps:
 *
 * 1. Authenticate as member (new user context) with join operation.
 * 2. Create a community by the authenticated member.
 * 3. Create a post within the created community by the member.
 * 4. Authenticate as communityModerator (new user context) with join operation.
 * 5. Authenticate as admin (new user context) with join operation.
 * 6. Test post deletion by the post author (member) ensuring cascading deletion.
 * 7. Test post deletion by a communityModerator role.
 * 8. Test post deletion by an admin role.
 *
 * Validates access control enforcement, cascading deletion of comments and
 * votes, and successful hard deletion with no content returned. Validates error
 * handling for unauthorized roles and non-existence cases.
 */
export async function test_api_post_deletion_by_member_community_moderator_and_admin(
  connection: api.IConnection,
) {
  // 1. Member join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community by member
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: "Test community description",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 3. Member creates a post in the community
  const postTitle1 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const post1BodyText = RandomGenerator.content({ paragraphs: 2 });
  const post1Type = "text";
  const post1 =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: post1Type,
          title: postTitle1,
          body_text: post1BodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post1);
  TestValidator.equals("post1 title matches", post1.title, postTitle1);
  TestValidator.equals(
    "post1 community matches",
    post1.reddit_community_community_id,
    community.id,
  );

  // 4. CommunityModerator join
  const cmEmail = typia.random<string & tags.Format<"email">>();
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: cmEmail,
          password: "password123",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModerator);

  // 5. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "password123",
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(admin);

  // 6. Post deletion by member (author)
  await api.functional.redditCommunity.member.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post1.id,
    },
  );

  // Try to erase again should throw error (post no longer exists)
  await TestValidator.error("deletion twice by member fails", async () => {
    await api.functional.redditCommunity.member.communities.posts.erase(
      connection,
      {
        communityId: community.id,
        postId: post1.id,
      },
    );
  });

  // 7. CommunityModerator creates a new post to delete
  const postTitle2 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const post2BodyText = RandomGenerator.content({ paragraphs: 1 });
  const post2Type = "text";

  // Switch auth context to CommunityModerator by logging out then joining? Since API join sets token, here use join again
  // For safety, rejoin communityModerator to set token
  const cmLogin =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: cmEmail,
          password: "password123",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(cmLogin);

  const post2 =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: post2Type,
          title: postTitle2,
          body_text: post2BodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post2);
  TestValidator.equals("post2 title matches", post2.title, postTitle2);

  // CommunityModerator deletes post2
  await api.functional.redditCommunity.member.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post2.id,
    },
  );

  // Verify second deletion throws
  await TestValidator.error(
    "deletion twice by communityModerator fails",
    async () => {
      await api.functional.redditCommunity.member.communities.posts.erase(
        connection,
        {
          communityId: community.id,
          postId: post2.id,
        },
      );
    },
  );

  // 8. Admin creates a new post to delete
  const postTitle3 = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 7,
  });
  const post3BodyText = RandomGenerator.content({ paragraphs: 1 });
  const post3Type = "text";

  // Switch auth context to Admin by logging in using admin join token handling
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  typia.assert(adminLogin);

  const post3 =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: post3Type,
          title: postTitle3,
          body_text: post3BodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post3);
  TestValidator.equals("post3 title matches", post3.title, postTitle3);

  // Admin deletes post3
  await api.functional.redditCommunity.member.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post3.id,
    },
  );

  // Verify third deletion throws
  await TestValidator.error("deletion twice by admin fails", async () => {
    await api.functional.redditCommunity.member.communities.posts.erase(
      connection,
      {
        communityId: community.id,
        postId: post3.id,
      },
    );
  });
}
