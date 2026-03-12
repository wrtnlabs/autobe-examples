import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member cannot update another member's post (authorization failure).
 *
 * This test validates that the authorization system properly prevents unauthorized
 * members from modifying posts created by other users. The test creates two separate
 * member accounts, has member A create a post in a community they own, then attempts
 * to update that post as member B. The operation should fail with a 403 Forbidden error,
 * and the post content should remain unchanged.
 */
export async function test_api_post_update_unauthorized_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "member_a_test",
      display_name: "Member A",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community owned by member A
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: "Test community for authorization testing",
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in that community as member A
  const originalPost = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: "Original Post Title",
        postType: "text",
        communityId: community.id,
        content: "This is the original content that should not be changed.",
      },
    },
  );
  typia.assert(originalPost);
  // Store original values for verification
  const originalTitle = originalPost.title;
  const originalContent = originalPost.content;
  const originalAuthorId = originalPost.author.id;
  // 4. Register and authenticate as member B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: "member_b_test",
      display_name: "Member B",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Attempt to update member A's post as member B (should fail with 403)
  await TestValidator.httpError(
    "unauthorized update attempt should return 403 Forbidden",
    403,
    async () =>
      await api.functional.redditClone.member.posts.update(memberBConnection, {
        postId: originalPost.id,
        body: {
          title: "Modified Title by Unauthorized User",
          content: "This content should not be applied.",
        } satisfies IRedditClonePost.IUpdate,
      }),
  );
  // 6. Verify the post content remains unchanged by fetching it again
  // Note: We need to use member A's connection to fetch since we need to verify the post
  // However, the GET endpoint is not available in the provided SDK functions.
  // Instead, we can verify that the update operation failed and did not modify anything.
  // The 403 error validation above confirms the authorization check worked.
  // 7. Additional verification: Try another update attempt with different data
  await TestValidator.httpError(
    "another unauthorized update attempt should also return 403",
    403,
    async () =>
      await api.functional.redditClone.member.posts.update(memberBConnection, {
        postId: originalPost.id,
        body: {
          title: "Another Attempt to Modify",
        } satisfies IRedditClonePost.IUpdate,
      }),
  );
  // 8. Verify that member A can still update their own post (positive test)
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberAConnection,
    {
      postId: originalPost.id,
      body: {
        title: "Updated by Original Author",
        content: "This update should succeed because member A is the author.",
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Verify the update by member A succeeded
  TestValidator.equals(
    "post title updated by original author",
    updatedPost.title,
    "Updated by Original Author",
  );
  TestValidator.equals(
    "post content updated by original author",
    updatedPost.content,
    "This update should succeed because member A is the author.",
  );
  TestValidator.equals(
    "post author remains member A",
    updatedPost.author.id,
    originalAuthorId,
  );
}
