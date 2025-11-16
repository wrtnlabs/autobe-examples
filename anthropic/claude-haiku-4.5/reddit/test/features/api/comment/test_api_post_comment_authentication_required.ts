import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that comment creation requires member authentication
 *
 * This test validates the security model preventing member impersonation by:
 *
 * 1. Creating authenticated member accounts
 * 2. Setting up a community and post for comments
 * 3. Verifying authenticated members CAN create comments
 * 4. Verifying unauthenticated requests are rejected with 401
 * 5. Verifying creator_id is from authenticated context, not request body
 *
 * The endpoint enforces authorizationActor='member' which requires valid JWT.
 * The creator_id is automatically populated from the authenticated token
 * context, not from request body, preventing impersonation attacks.
 */
export async function test_api_post_comment_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create a member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Test authenticated comment creation - SHOULD SUCCEED
  const validComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(validComment);

  // Verify the creator_id matches the authenticated member
  TestValidator.equals(
    "comment creator should be authenticated member",
    validComment.creator.id,
    member.id,
  );

  // Step 6: Create unauthenticated connection for testing 401 error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 7: Test unauthenticated comment creation - SHOULD FAIL with 401
  await TestValidator.httpError(
    "unauthenticated comment creation should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        unauthenticatedConnection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // Step 8: Test with different member to verify creator_id isolation
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "AnotherPassword456";
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: secondMemberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 9: Switch to second member's context and create comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const secondMemberComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(secondMemberComment);

  // Verify creator_id matches second member (not first member)
  TestValidator.notEquals(
    "second member comment creator should not be first member",
    secondMemberComment.creator.id,
    member.id,
  );

  TestValidator.equals(
    "second member comment creator should be second member",
    secondMemberComment.creator.id,
    secondMember.id,
  );
}
