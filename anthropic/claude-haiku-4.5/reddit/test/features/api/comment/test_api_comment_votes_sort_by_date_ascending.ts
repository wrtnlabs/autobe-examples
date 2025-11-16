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
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_comment_votes_sort_by_date_ascending(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology related discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create first member account
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 3: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community-${RandomGenerator.alphaNumeric(6)}`,
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          description: "Test community for vote sorting",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Test Post-${RandomGenerator.alphaNumeric(6)}`,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Create multiple members and cast votes with time delays
  const voterCount = 3;
  const memberEmails = [memberEmail1];

  // Create additional members for voting
  for (let i = 1; i < voterCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    memberEmails.push(email);

    const newMember = await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(newMember);
  }

  // Step 7: Cast votes from different members with time delays
  const voteTypes = ["upvote", "downvote", "upvote"] as const;
  const votes: ICommunityPlatformVote[] = [];

  for (let i = 0; i < voterCount; i++) {
    // Login as the i-th member
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmails[i],
        password: "MemberPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    // Cast vote
    const vote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            content_type: "comment",
            content_id: comment.id,
            vote_type: voteTypes[i],
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    votes.push(vote);

    // Add delay between votes to ensure distinct timestamps
    if (i < voterCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 8: Query votes with ascending sort by created_at
  const votesResult =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesResult);

  // Step 9: Validate that votes are sorted in ascending chronological order
  TestValidator.predicate(
    "votes returned are not empty",
    votesResult.data.length > 0,
  );
  TestValidator.equals(
    "returned votes count matches created votes",
    votesResult.data.length,
    voterCount,
  );

  // Verify chronological ascending order
  for (let i = 0; i < votesResult.data.length - 1; i++) {
    const currentVote = votesResult.data[i];
    const nextVote = votesResult.data[i + 1];
    const currentTime = new Date(currentVote.created_at).getTime();
    const nextTime = new Date(nextVote.created_at).getTime();

    TestValidator.predicate(
      `vote ${i} created_at timestamp (${currentVote.created_at}) is less than or equal to vote ${i + 1} (${nextVote.created_at}) in ascending order`,
      currentTime <= nextTime,
    );
  }

  // Verify first vote is earliest and last vote is latest
  const firstVote = votesResult.data[0];
  const lastVote = votesResult.data[votesResult.data.length - 1];
  TestValidator.predicate(
    "first vote timestamp is earlier than or equal to last vote timestamp",
    new Date(firstVote.created_at).getTime() <=
      new Date(lastVote.created_at).getTime(),
  );
}
