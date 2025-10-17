import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Member can update their own comment on a post, but NOT another user's
 * comment; enforces author-only edit rule, correct comment persistence, and
 * validity checks.
 *
 * 1. Register a new member (and login)
 * 2. Create a new community as this member
 * 3. Create a new post in the community as the same member
 * 4. Add a comment to the post as the member
 * 5. Update the comment's body (positive case; should succeed)
 * 6. Check returned comment body and updated_at is changed
 * 7. Try to update the comment with empty string (should fail validation)
 * 8. Register a second member (attacker) and login as them
 * 9. Try to update the first member's comment as the attacker (should fail)
 */
export async function test_api_comment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register primary member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create community as this member
  const communityReq = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(community);

  // 3. Create post in the community
  const postReq = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postReq,
    });
  typia.assert(post);

  // 4. Add a comment to the post
  const commentReq = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentReq,
      },
    );
  typia.assert(comment);

  // 5. Update the comment body as the author
  const updatedBody = RandomGenerator.paragraph({ sentences: 6 });
  const updated: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedBody,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "comment body updates after edit",
    updated.body,
    updatedBody,
  );
  TestValidator.notEquals(
    "updated_at changes on comment edit",
    updated.updated_at,
    comment.updated_at,
  );
  TestValidator.equals(
    "comment author remains same after edit",
    updated.community_platform_member_id,
    member.id,
  );

  // 6. Try to update with empty string (should fail)
  await TestValidator.error("update fails for empty body", async () => {
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: "",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  });

  // 7. Register a second member as 'attacker'
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerPassword = RandomGenerator.alphaNumeric(10);
  const attacker: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: attackerEmail,
        password: attackerPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(attacker);

  // 8. Try to update original comment as attacker (should fail authorization)
  await TestValidator.error(
    "another member cannot edit other's comment",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.update(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}
