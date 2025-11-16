import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a member cannot delete another member's post.
 *
 * This test validates authorization controls for post deletion. Only the post
 * creator, community moderators, or administrators should be able to delete
 * posts. When an unauthorized member attempts to delete another member's post,
 * the API should return a 403 Forbidden error.
 *
 * Workflow:
 *
 * 1. Create first member account (post creator)
 * 2. Create a community under first member
 * 3. Create a post in the community under first member
 * 4. Create second member account (unauthorized user)
 * 5. Attempt to delete the first member's post using second member's credentials
 * 6. Verify deletion fails with 403 Forbidden error
 */
export async function test_api_post_deletion_unauthorized_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (post creator)
  const firstMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/signup",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Create a community under first member
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create a post in the community under first member
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create second member account (unauthorized user)
  const secondMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/signup",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const secondMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 5: Attempt to delete the first member's post using second member's authentication
  // The connection's Authorization header has been updated by the second member join
  await TestValidator.error(
    "unauthorized member should not be able to delete another member's post",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: post.id,
      });
    },
  );

  // Verify the post still exists by checking that deletion was prevented
  TestValidator.predicate(
    "post should still be owned by first member",
    post.creator.id === firstMember.id,
  );
}
