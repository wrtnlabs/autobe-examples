import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";

export async function test_api_post_vote_create_by_member(
  connection: api.IConnection,
) {
  /**
   * E2E test: Member creates community and post, then casts votes on the post.
   *
   * Steps:
   *
   * 1. Register a fresh member (auth.member.join)
   * 2. Create a community (communityPortal.member.communities.create)
   * 3. Subscribe the member to the community (communities.subscriptions.create)
   * 4. Create a text post in the community (communityPortal.member.posts.create)
   * 5. Attempt unauthenticated vote (expect error)
   * 6. Cast an upvote (+1) and assert returned vote shape
   * 7. Attempt invalid vote value (e.g., 2) and expect error
   * 8. Attempt vote on non-existent post and expect error
   * 9. Attempt duplicate identical vote and assert consistent handling
   * 10. Switch vote to -1 and assert returned vote value
   */

  // 1) Register a fresh member
  const username = RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // member.token is set and SDK updates connection.headers.Authorization in join
  TestValidator.predicate("member has id", typeof member.id === "string");

  // 2) Create a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: (RandomGenerator.paragraph({ sentences: 1 }) || "c")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals("community id assigned", typeof community.id, "string");

  // 3) Subscribe member to the community
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
  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    community.id,
  );

  // 4) Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community_id,
    community.id,
  );

  // Prepare an unauthenticated connection copy (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) Unauthenticated vote should be rejected (401)
  await TestValidator.error(
    "unauthenticated vote attempt should fail",
    async () => {
      await api.functional.communityPortal.member.posts.votes.create(
        unauthConn,
        {
          postId: post.id,
          body: { value: 1 } satisfies ICommunityPortalVote.ICreate,
        },
      );
    },
  );

  // 6) Cast an upvote (+1)
  const upvote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(connection, {
      postId: post.id,
      body: { value: 1 } satisfies ICommunityPortalVote.ICreate,
    });
  typia.assert(upvote);

  TestValidator.equals("upvote belongs to member", upvote.user_id, member.id);
  TestValidator.equals("upvote targets post", upvote.post_id, post.id);
  TestValidator.equals("upvote value is +1", upvote.value, 1);

  // 7) Invalid vote value (e.g., 2) -> expect business validation error (400)
  await TestValidator.error("invalid vote value should fail", async () => {
    await api.functional.communityPortal.member.posts.votes.create(connection, {
      postId: post.id,
      body: { value: 2 } satisfies ICommunityPortalVote.ICreate,
    });
  });

  // 8) Voting on non-existent post -> expect error
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "voting on non-existent post should fail",
    async () => {
      await api.functional.communityPortal.member.posts.votes.create(
        connection,
        {
          postId: fakePostId,
          body: { value: 1 } satisfies ICommunityPortalVote.ICreate,
        },
      );
    },
  );

  // 9) Attempt duplicate identical vote (+1 again) - system must handle consistently
  let duplicateErrored = false;
  let duplicateResult: ICommunityPortalVote | undefined = undefined;
  try {
    duplicateResult =
      await api.functional.communityPortal.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: { value: 1 } satisfies ICommunityPortalVote.ICreate,
        },
      );
    typia.assert(duplicateResult);
  } catch (exp) {
    duplicateErrored = true;
  }

  TestValidator.predicate(
    "duplicate identical vote handled (error OR returned vote with same value)",
    duplicateErrored ||
      (duplicateResult !== undefined && duplicateResult.value === 1),
  );

  // 10) Switch vote to -1 (update/upsert semantics) and assert final vote value is -1
  const switched: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(connection, {
      postId: post.id,
      body: { value: -1 } satisfies ICommunityPortalVote.ICreate,
    });
  typia.assert(switched);
  TestValidator.equals("switched vote value is -1", switched.value, -1);
  TestValidator.equals(
    "switched vote references same post",
    switched.post_id,
    post.id,
  );
  TestValidator.equals(
    "switched vote references same user",
    switched.user_id,
    member.id,
  );
}
