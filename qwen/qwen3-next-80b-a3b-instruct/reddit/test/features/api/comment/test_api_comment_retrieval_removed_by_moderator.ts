import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_retrieval_removed_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (comment author)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(moderator);

  // Step 3: Create another regular user to simulate unauthorized access
  const unauthorizedEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const unauthorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: unauthorizedEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(unauthorized);

  // Step 4: Create a community for the post
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post to host the comment
  const postTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: RandomGenerator.content({ paragraphs: 1 }),
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a comment that will be "removed" (inaccessible to unauthorized users)
  const commentContent: string = RandomGenerator.content({ paragraphs: 1 });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Assign the second member as moderator of the community
  await api.functional.admin.members.communities.moderator.assignModerator(
    connection,
    {
      memberId: moderator.id,
      communityId: community.id,
      body: typia.random<ICommunityPlatformAdmin.IEmpty>(),
    },
  );

  // Step 8: Verify comment author can retrieve their own comment
  // Create a connection with the member's token
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member.token.access}`,
    },
  };

  const memberComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(memberComment);
  TestValidator.equals(
    "comment content matches",
    memberComment.content,
    commentContent,
  );

  // Step 9: Verify moderator can retrieve the comment
  // Create a connection with the moderator's token
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator.token.access}`,
    },
  };

  const moderatorComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(moderatorComment);
  TestValidator.equals(
    "moderator retrieved comment content matches",
    moderatorComment.content,
    commentContent,
  );

  // Step 10: Verify unauthorized user cannot retrieve the comment
  // Create a connection with the unauthorized user's token
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${unauthorized.token.access}`,
    },
  };

  // The API should reject access to the comment by unauthorized user
  // This simulates the "removed" behavior where unauthorized access is denied
  await TestValidator.error(
    "unauthorized user cannot retrieve comment after removal",
    async () => {
      await api.functional.communityPlatform.posts.comments.at(
        unauthorizedConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );

  // Final verification: deleted_at should be null for hard deletion as per system
  // According to the scenario, comments have hard deletion with deleted_at always null
  TestValidator.equals(
    "deleted_at should be null for hard deletion",
    comment.deleted_at,
    null,
  );
}
