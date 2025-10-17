import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_post_soft_delete_by_author(
  connection: api.IConnection,
) {
  /**
   * Validate that a post author can soft-delete their post via the member posts
   * erase endpoint. Because the SDK does not expose a GET post-by-id public
   * detail endpoint, the test verifies soft-delete semantics by asserting that
   * re-deleting the same post fails (404 behavior described by the erase
   * operation contract).
   *
   * Steps:
   *
   * 1. Register a new member (author) and obtain auth token via join().
   * 2. Create a community.
   * 3. Subscribe the author to the community.
   * 4. Create a text post in the community.
   * 5. Erase (soft-delete) the post.
   * 6. Attempt to erase the same post again and expect an error (404).
   */

  // 1) Author registration
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);

  // Basic sanity checks
  TestValidator.predicate(
    "author has token and id",
    author.token !== undefined && author.id !== undefined,
  );

  // 2) Create community
  const createCommunityBody = {
    name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
    slug: `test-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community created has id",
    community.id !== null && community.id !== undefined,
  );

  // 3) Subscribe the author to the community (membership flow)
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);
  TestValidator.predicate(
    "subscription created has id",
    subscription.id !== null && subscription.id !== undefined,
  );

  // 4) Create a text post
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.predicate(
    "post created has id",
    post.id !== null && post.id !== undefined,
  );

  // 5) Erase (soft-delete) the post - expected to succeed (204 semantics)
  await api.functional.communityPortal.member.posts.erase(connection, {
    postId: post.id,
  });

  // 6) Attempt to erase again - expect an error (post no longer exists / already deleted)
  await TestValidator.error(
    "erasing already-deleted post should error",
    async () => {
      await api.functional.communityPortal.member.posts.erase(connection, {
        postId: post.id,
      });
    },
  );

  // NOTE: Audit record and related entities (comments, votes, reports)
  // verification are intentionally omitted because the SDK does not provide
  // corresponding GET endpoints. Those checks can be added when the API
  // surface exposes the necessary read endpoints.
}
