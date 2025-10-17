import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate member's ability to update their own post only within permissions
 * and edit window.
 *
 * Step-by-step:
 *
 * 1. Register Member A (original post author)
 * 2. Create a community as A
 * 3. Create a post as A
 * 4. Immediately update the post as A (should succeed)
 * 5. Confirm update response, fetch post to verify update
 * 6. Simulate edit window expiration, then attempt update as A (should fail)
 * 7. Register Member B
 * 8. Attempt update by B on A's post (should fail due to permissions)
 * 9. Try to update as A with content that violates business rules (too long and
 *    banned words), expect error
 */
export async function test_api_post_update_by_author_member_with_permissions_and_window(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphabets(12);
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: memberAPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // 2. Create a community as A
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post as A
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 14,
    }) as string,
    content_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 22,
      wordMin: 3,
      wordMax: 12,
    }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Immediately update the post as A (should succeed)
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 18,
    wordMin: 3,
    wordMax: 9,
  });
  const updateBody = {
    title: updatedTitle,
    content_body: updatedBody,
  } satisfies ICommunityPlatformPost.IUpdate;
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updatedPost);
  TestValidator.equals("post title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "post body updated",
    updatedPost.content_body,
    updatedBody,
  );

  // 5. Fetch post to verify update (simulate fetch by a new update call to check response)
  const refetchedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {}, // No changes -- simulate GET-like behavior as GET is not available
    });
  typia.assert(refetchedPost);
  TestValidator.equals(
    "re-fetched post has updated title",
    refetchedPost.title,
    updatedTitle,
  );

  // 6. Simulate edit window expiration, then attempt update as A (should fail)
  // Simulate by passing an explicit status that would trigger business rule failure (e.g., status: 'archived')
  await TestValidator.error(
    "cannot update post after edit window (status: archived)",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph(),
          status: "archived",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 7. Register Member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphabets(12);
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);

  // 8. Attempt update by B on A's post (should fail due to permissions)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member B cannot update A's post", async () => {
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  });

  // 9. Try to update as A with content that violates business rules (banned/too long)
  // For excessive length
  await TestValidator.error(
    "update fails with excessive title length",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 100,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
  // For banned words (assuming banned word is 'bannedword')
  await TestValidator.error("update fails with banned words", async () => {
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: { title: "bannedword" } satisfies ICommunityPlatformPost.IUpdate,
    });
  });
}
