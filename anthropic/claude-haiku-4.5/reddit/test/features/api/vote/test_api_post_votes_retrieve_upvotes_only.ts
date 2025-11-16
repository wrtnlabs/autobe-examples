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

export async function test_api_post_votes_retrieve_upvotes_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for post and vote creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
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

  // Step 6: Create additional member accounts with stored passwords for voting
  const voters: Array<{ email: string; password: string }> =
    await ArrayUtil.asyncRepeat(5, async () => {
      const email = typia.random<string & tags.Format<"email">>();
      const password = RandomGenerator.alphabets(12);
      const voter: ICommunityPlatformMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            email: email,
            username: RandomGenerator.name(1),
            password: password,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformMember.ICreate,
        });
      typia.assert(voter);
      return { email, password };
    });

  // Step 7: Cast votes on the post (3 upvotes and 2 downvotes)
  const upvoteCount = 3;
  const downvoteCount = 2;

  // Cast upvotes
  for (let i = 0; i < upvoteCount; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voters[i].email,
        password: voters[i].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            content_type: "post",
            content_id: post.id,
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  }

  // Cast downvotes
  for (let i = upvoteCount; i < upvoteCount + downvoteCount; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voters[i].email,
        password: voters[i].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            content_type: "post",
            content_id: post.id,
            vote_type: "downvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    TestValidator.equals("vote type is downvote", vote.vote_type, "downvote");
  }

  // Step 8: Retrieve votes filtered by upvote_type
  const votesResponse: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesResponse);

  // Step 9: Validate the response
  TestValidator.equals(
    "pagination current page is 1",
    votesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is set correctly",
    votesResponse.pagination.limit >= 10,
  );

  // Validate that only upvotes are returned
  TestValidator.equals(
    "upvotes count matches expected",
    votesResponse.data.length,
    upvoteCount,
  );

  // Verify each vote record is an upvote
  votesResponse.data.forEach((vote, index) => {
    TestValidator.equals(
      `vote ${index} type is upvote`,
      vote.vote_type,
      "upvote",
    );
    TestValidator.equals(
      `vote ${index} content type is post`,
      vote.content_type,
      "post",
    );
    TestValidator.equals(
      `vote ${index} content_id matches post`,
      vote.content_id,
      post.id,
    );
    typia.assert(vote.member);
    TestValidator.predicate(
      `vote ${index} has member information`,
      vote.member.id !== undefined,
    );
    typia.assert(vote.created_at);
  });

  // Validate pagination records count
  TestValidator.equals(
    "pagination records equals upvote count",
    votesResponse.pagination.records,
    upvoteCount,
  );
}
