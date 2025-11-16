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

export async function test_api_voting_records_administrator_filter_by_vote_type(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create posts for voting
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  });
  typia.assert(posts);

  // 5. Cast votes - upvotes on first two posts, downvote on third
  const upvote1 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: posts[0].id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(upvote1);

  const upvote2 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: posts[1].id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(upvote2);

  const downvote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: posts[2].id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(downvote);

  // 6. Login as administrator to filter votes
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // 7. Filter votes by upvote type
  const upvoteResults =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(upvoteResults);

  TestValidator.predicate(
    "upvote results should contain upvotes only",
    upvoteResults.data.every((vote) => vote.vote_type === "upvote"),
  );
  TestValidator.predicate(
    "upvote results should contain at least 2 upvotes",
    upvoteResults.data.length >= 2,
  );

  // 8. Filter votes by downvote type
  const downvoteResults =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvoteResults);

  TestValidator.predicate(
    "downvote results should contain downvotes only",
    downvoteResults.data.every((vote) => vote.vote_type === "downvote"),
  );
  TestValidator.predicate(
    "downvote results should contain at least 1 downvote",
    downvoteResults.data.length >= 1,
  );

  // 9. Filter without vote_type to get all votes
  const allResults =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(allResults);

  TestValidator.predicate(
    "all results should contain both upvotes and downvotes",
    allResults.data.some((vote) => vote.vote_type === "upvote") &&
      allResults.data.some((vote) => vote.vote_type === "downvote"),
  );

  // 10. Verify filtering accuracy
  TestValidator.predicate(
    "upvote filter count should be less than or equal to total votes",
    upvoteResults.data.length <= allResults.data.length,
  );
  TestValidator.predicate(
    "downvote filter count should be less than or equal to total votes",
    downvoteResults.data.length <= allResults.data.length,
  );
  TestValidator.equals(
    "sum of filtered results equals total votes",
    upvoteResults.data.length + downvoteResults.data.length,
    allResults.data.length,
  );
}
