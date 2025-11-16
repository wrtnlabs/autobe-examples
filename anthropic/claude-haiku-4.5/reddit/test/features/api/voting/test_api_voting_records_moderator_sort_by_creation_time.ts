import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_voting_records_moderator_sort_by_creation_time(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // 2. Create member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 3. Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 4. Create multiple posts
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const postData = {
      community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      content_text: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: postData,
      },
    );
    typia.assert(post);
    posts.push(post);

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 5. Cast votes on different posts to create vote records
  const votes: ICommunityPlatformVote[] = [];
  for (let i = 0; i < posts.length; i++) {
    const voteData = {
      content_type: "post",
      content_id: posts[i].id,
      vote_type: i % 2 === 0 ? "upvote" : "downvote",
    } satisfies ICommunityPlatformVote.ICreate;

    const vote = await api.functional.communityPlatform.member.votes.create(
      connection,
      {
        body: voteData,
      },
    );
    typia.assert(vote);
    votes.push(vote);

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 6. Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      href: moderatorData.href,
      referrer: moderatorData.referrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Retrieve votes sorted by created_at in ascending order
  const votesAscending =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesAscending);

  // 8. Verify ascending order - votes should be sorted from oldest to newest
  TestValidator.predicate(
    "ascending votes should have data",
    votesAscending.data.length > 0,
  );

  for (let i = 0; i < votesAscending.data.length - 1; i++) {
    const currentVote = votesAscending.data[i];
    const nextVote = votesAscending.data[i + 1];

    const currentTime = new Date(currentVote.created_at).getTime();
    const nextTime = new Date(nextVote.created_at).getTime();

    TestValidator.predicate(
      `vote at index ${i} should be earlier than or equal to vote at index ${i + 1} in ascending order`,
      currentTime <= nextTime,
    );
  }

  // 9. Retrieve votes sorted by created_at in descending order
  const votesDescending =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesDescending);

  // 10. Verify descending order - votes should be sorted from newest to oldest
  TestValidator.predicate(
    "descending votes should have data",
    votesDescending.data.length > 0,
  );

  for (let i = 0; i < votesDescending.data.length - 1; i++) {
    const currentVote = votesDescending.data[i];
    const nextVote = votesDescending.data[i + 1];

    const currentTime = new Date(currentVote.created_at).getTime();
    const nextTime = new Date(nextVote.created_at).getTime();

    TestValidator.predicate(
      `vote at index ${i} should be later than or equal to vote at index ${i + 1} in descending order`,
      currentTime >= nextTime,
    );
  }

  // 11. Verify that ascending and descending results are inverse of each other
  TestValidator.equals(
    "ascending and descending should return same number of votes",
    votesAscending.data.length,
    votesDescending.data.length,
  );

  // Verify reverse order: last element of ascending should be first of descending
  if (votesAscending.data.length > 0) {
    const lastAscending = votesAscending.data[votesAscending.data.length - 1];
    const firstDescending = votesDescending.data[0];

    TestValidator.equals(
      "last vote in ascending order should be first in descending order",
      lastAscending.id,
      firstDescending.id,
    );
  }
}
