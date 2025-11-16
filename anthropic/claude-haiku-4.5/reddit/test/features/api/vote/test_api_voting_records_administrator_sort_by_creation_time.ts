import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_voting_records_administrator_sort_by_creation_time(
  connection: api.IConnection,
) {
  // Create administrator account with stored password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Create member account for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post to receive votes
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Create multiple votes
  const votes: ICommunityPlatformVote[] = [];
  for (let i = 0; i < 5; i++) {
    const vote = await api.functional.communityPlatform.member.votes.create(
      connection,
      {
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: i % 2 === 0 ? "upvote" : "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
    typia.assert(vote);
    votes.push(vote);
  }

  // Authenticate as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Test ascending order (oldest first)
  const ascendingResult =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(ascendingResult);
  TestValidator.predicate(
    "ascending order should return data",
    ascendingResult.data.length > 0,
  );

  // Verify ascending order - check that created_at timestamps are in ascending order
  for (let i = 1; i < ascendingResult.data.length; i++) {
    const prevVote = ascendingResult.data[i - 1];
    const currVote = ascendingResult.data[i];
    TestValidator.predicate(
      `ascending order: vote ${i - 1} created_at <= vote ${i} created_at`,
      new Date(prevVote.created_at).getTime() <=
        new Date(currVote.created_at).getTime(),
    );
  }

  // Test descending order (newest first)
  const descendingResult =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(descendingResult);
  TestValidator.predicate(
    "descending order should return data",
    descendingResult.data.length > 0,
  );

  // Verify descending order - check that created_at timestamps are in descending order
  for (let i = 1; i < descendingResult.data.length; i++) {
    const prevVote = descendingResult.data[i - 1];
    const currVote = descendingResult.data[i];
    TestValidator.predicate(
      `descending order: vote ${i - 1} created_at >= vote ${i} created_at`,
      new Date(prevVote.created_at).getTime() >=
        new Date(currVote.created_at).getTime(),
    );
  }

  // Verify pagination
  TestValidator.equals(
    "pagination current page should be 1",
    ascendingResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be greater than or equal to data length",
    ascendingResult.pagination.records >= ascendingResult.data.length,
  );
}
