import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate the retrieval and accuracy of a post's controversial score,
 * including access and error scenarios.
 *
 * 1. Register two members with known passwords
 * 2. Create a community as the first member
 * 3. Create a post in the new community
 * 4. Have both members upvote/downvote, simulating controversy
 * 5. Retrieve and validate controversial score changes in response to voting
 *    pattern
 * 6. Attempt to access the post's controversial score after making the post or
 *    community inaccessible is not possible (comment only)
 * 7. Attempt to retrieve a controversial score for a non-existent post (expect
 *    error)
 */
export async function test_api_post_controversial_score_access_and_accuracy(
  connection: api.IConnection,
) {
  // 1. Register two members with known passwords
  const password1 = RandomGenerator.alphaNumeric(12);
  const password2 = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password1,
    },
  });
  typia.assert(member1);
  const member1Email = member1.email;
  // Register member2 (will swap the auth context)
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password2,
    },
  });
  typia.assert(member2);
  const member2Email = member2.email;

  // Switch context back to member1 using re-join
  await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: password1,
    },
  });

  // 2. Create a community as member1
  const commName = RandomGenerator.alphaNumeric(8);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: commName,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: commName + "-slug",
        },
      },
    );
  typia.assert(community);

  // 3. Create a post in the community as member1
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 12,
        }) satisfies string & tags.MaxLength<300>,
        content_body: RandomGenerator.content({
          paragraphs: 2,
        }) satisfies string,
        content_type: "text",
        status: "published",
      },
    },
  );
  typia.assert(post);

  // 4. Upvote and downvote scenarios
  // member1 upvotes the post
  await api.functional.communityPlatform.member.posts.votes.create(connection, {
    postId: post.id,
    body: { vote_value: 1 as 1 },
  });
  // Switch to member2 (login as member2)
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: password2,
    },
  });
  // member2 downvotes the post
  await api.functional.communityPlatform.member.posts.votes.create(connection, {
    postId: post.id,
    body: { vote_value: -1 as -1 },
  });

  // Retrieve controversial score after mixed votes
  const score1 =
    await api.functional.communityPlatform.posts.controversialScore.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(score1);
  TestValidator.predicate(
    "controversial score should be > 0 with mixed votes",
    score1.controversial_score > 0,
  );
  TestValidator.equals(
    "postId should match in controversial score",
    score1.community_platform_post_id,
    post.id,
  );

  // member2 changes their vote to upvote (vote_value: 1)
  await api.functional.communityPlatform.member.posts.votes.create(connection, {
    postId: post.id,
    body: { vote_value: 1 as 1 },
  });
  // Retrieve controversial score after both upvotes
  const score2 =
    await api.functional.communityPlatform.posts.controversialScore.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(score2);
  TestValidator.predicate(
    "controversial score should decrease with only upvotes",
    score2.controversial_score < score1.controversial_score,
  );

  // 5. Attempt to simulate inaccessibility (not possible via current API, so comment only)
  // No API provided to make the community or post private/banned/deleted. If present, would test access failure here.

  // 6. Edge case: request controversial score for a non-existent post
  await TestValidator.error(
    "requesting controversial score for a non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.posts.controversialScore.at(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
