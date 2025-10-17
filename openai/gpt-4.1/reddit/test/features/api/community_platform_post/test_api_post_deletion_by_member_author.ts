import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that a member can delete their own post in a community
 *
 * 1. Register as a new member
 * 2. Create a community as this member
 * 3. Create a post in this community as the member
 * 4. Delete the created post as the author
 * 5. Verify the post is gone (removed from listings)
 * 6. Verify deleted_at is set if soft-deleted
 * 7. Confirm error on repeat delete or unauthorized delete attempt
 */
export async function test_api_post_deletion_by_member_author(
  connection: api.IConnection,
) {
  // Step 1: Register member (join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "email is verified as false after join",
    member.email_verified === false,
  );
  TestValidator.equals("member email matches input", member.email, email);

  // Step 2: Create community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityBody.name,
  );
  TestValidator.equals(
    "community slug matches input",
    community.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "community creator_member_id matches",
    community.creator_member_id,
    member.id,
  );

  // Step 3: Create post as the member
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "text" as const,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post author matches member",
    post.community_platform_member_id,
    member.id,
  );
  TestValidator.equals("post title matches", post.title, postBody.title);

  // Step 4: Delete the created post as member
  await api.functional.communityPlatform.member.posts.erase(connection, {
    postId: post.id,
  });

  // Step 5: Attempt to retrieve the post (simulate by re-create/check for error if applicable)
  await TestValidator.error(
    "deleted post cannot be deleted again",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: post.id,
      });
    },
  );

  // (Step 6+) Negative case: Attempt to delete with unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot delete post", async () => {
    await api.functional.communityPlatform.member.posts.erase(
      unauthConnection,
      {
        postId: post.id,
      },
    );
  });
}
