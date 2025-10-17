import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_post_retrieval_by_id_with_visibility(
  connection: api.IConnection,
) {
  /**
   * Validate post retrieval and community visibility rules.
   *
   * Steps:
   *
   * 1. Register a new member (author)
   * 2. Create one public and one private community as that author
   * 3. Subscribe the author to the private community (to allow posting/viewing)
   * 4. Create a text post in each community
   * 5. As an unauthenticated caller, GET the public post -> expect success
   * 6. As an unauthenticated caller, GET the private post -> expect an error
   * 7. As the authenticated author, GET both posts -> expect success and correct
   *    payload
   * 8. Attempt to GET a non-existent postId -> expect an error
   */

  // 1) Register a new member (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.name(1);
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: "P@ssw0rd123",
        display_name: RandomGenerator.name(2),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);
  TestValidator.predicate(
    "author id present",
    author.id !== undefined && author.id !== null,
  );

  // 2) Create a public community
  const publicCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(publicCommunity);

  // 2b) Create a private community
  const privateCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        is_private: true,
        visibility: "private",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(privateCommunity);

  // 3) Subscribe the author to the private community so they can create/view posts
  const subscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: privateCommunity.id,
        body: {
          community_id: privateCommunity.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    privateCommunity.id,
  );

  // 4) Create a text post in the public community
  const publicPost = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: publicCommunity.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(publicPost);

  // Create a text post in the private community
  const privatePost = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: privateCommunity.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(privatePost);

  // 5) As an unauthenticated caller, request GET /communityPortal/posts/{postId}
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicRetrieved: ICommunityPortalPost =
    await api.functional.communityPortal.posts.at(unauthConn, {
      postId: publicPost.id,
    });
  typia.assert(publicRetrieved);
  TestValidator.equals(
    "public post id matches",
    publicRetrieved.id,
    publicPost.id,
  );
  TestValidator.equals(
    "public post community matches",
    publicRetrieved.community_id,
    publicCommunity.id,
  );
  TestValidator.predicate(
    "public post has required fields",
    publicRetrieved.title !== undefined &&
      publicRetrieved.created_at !== undefined &&
      publicRetrieved.status !== undefined,
  );

  // 6) As an unauthenticated caller, attempting to fetch a private-community post should error
  await TestValidator.error(
    "unauthenticated cannot view private post",
    async () => {
      await api.functional.communityPortal.posts.at(unauthConn, {
        postId: privatePost.id,
      });
    },
  );

  // 7) As the authenticated author, request GET for both posts and verify details
  const publicRetrievedAuth: ICommunityPortalPost =
    await api.functional.communityPortal.posts.at(connection, {
      postId: publicPost.id,
    });
  typia.assert(publicRetrievedAuth);
  TestValidator.equals(
    "authenticated view public post id",
    publicRetrievedAuth.id,
    publicPost.id,
  );
  TestValidator.equals(
    "authenticated view public post community",
    publicRetrievedAuth.community_id,
    publicCommunity.id,
  );
  TestValidator.equals(
    "authenticated view public post author",
    publicRetrievedAuth.author_user_id,
    author.id,
  );

  const privateRetrievedAuth: ICommunityPortalPost =
    await api.functional.communityPortal.posts.at(connection, {
      postId: privatePost.id,
    });
  typia.assert(privateRetrievedAuth);
  TestValidator.equals(
    "authenticated view private post id",
    privateRetrievedAuth.id,
    privatePost.id,
  );
  TestValidator.equals(
    "authenticated view private post community",
    privateRetrievedAuth.community_id,
    privateCommunity.id,
  );
  TestValidator.equals(
    "authenticated view private post author",
    privateRetrievedAuth.author_user_id,
    author.id,
  );

  // 8) Non-existent post -> expect an error (use a random UUID unlikely to exist)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent post should error", async () => {
    await api.functional.communityPortal.posts.at(connection, {
      postId: randomId,
    });
  });
}
