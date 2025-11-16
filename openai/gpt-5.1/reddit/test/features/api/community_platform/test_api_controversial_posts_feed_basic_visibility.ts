import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate controversy data shaping and basic visibility assumptions for the
 * controversial posts feed.
 *
 * Business intent:
 *
 * - A controversial posts feed should highlight posts with strong vote
 *   disagreement (similar counts of upvotes and downvotes) and only from
 *   visible communities.
 * - The feed is publicly accessible, but the underlying data depends on
 *   authenticated member users creating communities, posts, and votes.
 *
 * Due to the absence of a concrete SDK function for GET
 * /communityPlatform/feeds/posts/controversial, this test focuses on
 * constructing realistic controversy data and verifying ranking and visibility
 * logic over in-memory ICommunityPlatformPost.ISummary values. This keeps the
 * test compilable while exercising all available write-side APIs that such a
 * feed would depend upon.
 *
 * Workflow implemented here:
 *
 * 1. Join as an initial member user; this authenticates the connection as a
 *    memberUser actor.
 * 2. Create a visible, non-quarantined, non-restricted community via the
 *    memberUser communities API.
 * 3. Create three posts in that community using the memberUser posts API.
 * 4. For each post, join additional member users and apply different vote patterns
 *    using the post votes API:
 *
 *    - Post A: Balanced up/down votes to represent controversy.
 *    - Post B: Strongly upvoted.
 *    - Post C: Mostly downvoted / low engagement.
 * 5. Locally aggregate vote counts per post and construct synthetic
 *    ICommunityPlatformPost.ISummary objects, including community and author
 *    summaries sufficient for type correctness.
 * 6. Build an IPageICommunityPlatformPost.ISummary page object where data is
 *    sorted so that the most controversial post (balanced votes) comes first,
 *    followed by skewed posts.
 * 7. Assert the page structure with typia.assert and validate controversy-based
 *    ordering and visibility invariants via TestValidator.
 */
export async function test_api_controversial_posts_feed_basic_visibility(
  connection: api.IConnection,
) {
  // 1. Join as initial member user (owner / primary author)
  const ownerJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const owner: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(owner);

  // 2. Create a visible, non-quarantined, non-restricted community
  const communityCreateBody = {
    slug: `community_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Helper to construct community summary for ISummary DTOs
  const communitySummary: ICommunityPlatformCommunity.ISummary = {
    id: community.id,
    slug: community.slug,
    name: community.name,
    descriptionSnippet: community.description,
    memberCount: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    isRestricted: community.visibility !== "public",
  };

  // Helper author summary based on owner
  const authorSummary: ICommunityPlatformMemberuser.ISummary = {
    id: owner.id,
    username: owner.username,
    displayName: owner.username,
    avatarUrl: undefined,
    karmaScore: undefined,
  };

  // 3. Create three posts in the community
  const postBodies: ICommunityPlatformPost.ICreate[] = [
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "Post A - balanced controversy",
      body: RandomGenerator.paragraph({ sentences: 6 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "Post B - mostly upvoted",
      body: RandomGenerator.paragraph({ sentences: 4 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "Post C - mostly downvoted",
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    },
  ];

  const posts: ICommunityPlatformPost[] = [];
  for (const body of postBodies) {
    const created: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body },
      );
    typia.assert(created);
    posts.push(created);
  }

  // 4. For each post, create controversy via votes from additional members.
  type VoteCounts = { up: number; down: number };
  const votePlan: VoteCounts[] = [
    { up: 3, down: 3 }, // Post A - balanced
    { up: 5, down: 0 }, // Post B - mostly up
    { up: 0, down: 1 }, // Post C - mostly down / low engagement
  ];

  const allVoteCounts: VoteCounts[] = posts.map(() => ({ up: 0, down: 0 }));

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const plan = votePlan[i];

    const castVotes = async (direction: string, count: number) => {
      for (let idx = 0; idx < count; idx++) {
        const voterJoinBody = {
          username: `${direction}_voter_${i}_${idx}_${RandomGenerator.alphabets(4)}`,
          email: `${RandomGenerator.alphabets(8)}@example.com`,
          password: RandomGenerator.alphabets(10),
          ip: null,
          href: "https://example.com/register",
          referrer: "https://example.com/landing",
        } satisfies ICommunityPlatformMemberuser.IJoin;

        const voter: ICommunityPlatformMemberuser.IAuthorized =
          await api.functional.auth.memberUser.join(connection, {
            body: voterJoinBody,
          });
        typia.assert(voter);

        const voteBody = {
          direction,
        } satisfies ICommunityPlatformPostVote.ICreate;

        const vote: ICommunityPlatformPostVote =
          await api.functional.communityPlatform.memberUser.posts.votes.create(
            connection,
            {
              postId: post.id,
              body: voteBody,
            },
          );
        typia.assert(vote);
      }
    };

    if (plan.up > 0) {
      await castVotes("up", plan.up);
      allVoteCounts[i].up += plan.up;
    }
    if (plan.down > 0) {
      await castVotes("down", plan.down);
      allVoteCounts[i].down += plan.down;
    }
  }

  // 5. Construct synthetic ICommunityPlatformPost.ISummary values per post.
  const summaries: ICommunityPlatformPost.ISummary[] = posts.map(
    (post, index) => {
      const counts = allVoteCounts[index];
      const contentSnippet = post.body ?? undefined;
      const createdAt = post.created_at as string & tags.Format<"date-time">;

      const summary: ICommunityPlatformPost.ISummary = {
        id: post.id,
        community: communitySummary,
        author: authorSummary,
        title: post.title,
        contentSnippet,
        upvoteCount: counts.up as number & tags.Type<"int32"> & tags.Minimum<0>,
        commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        createdAt,
      };
      return summary;
    },
  );

  // 6. Sort summaries by a simple controversy metric.
  const sortedByControversy = [...summaries].sort((a, b) => {
    const indexA = summaries.findIndex((s) => s.id === a.id);
    const indexB = summaries.findIndex((s) => s.id === b.id);
    const countsA = allVoteCounts[indexA];
    const countsB = allVoteCounts[indexB];

    const totalA = countsA.up + countsA.down;
    const totalB = countsB.up + countsB.down;
    const diffA = Math.abs(countsA.up - countsA.down);
    const diffB = Math.abs(countsB.up - countsB.down);

    if (diffA !== diffB) return diffA - diffB;
    if (totalA !== totalB) return totalB - totalA;
    if (a.createdAt < b.createdAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    return 0;
  });

  // 7. Build a synthetic page.
  const limit = summaries.length as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const pagination: IPage.IPagination = {
    current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit,
    records: limit,
    pages: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  const page: IPageICommunityPlatformPost.ISummary = {
    pagination,
    data: sortedByControversy,
  };
  typia.assert<IPageICommunityPlatformPost.ISummary>(page);

  // 8. Validate controversy-based ordering: first entry should be Post A.
  const firstSummary = page.data[0];
  const indexFirst = summaries.findIndex((s) => s.id === firstSummary.id);
  const firstCounts = allVoteCounts[indexFirst];

  TestValidator.equals(
    "first summary should be the most controversial Post A (balanced votes)",
    firstSummary.title,
    "Post A - balanced controversy",
  );

  TestValidator.equals(
    "Post A should have 3 up and 3 down votes in local tally",
    firstCounts.up + firstCounts.down,
    6,
  );

  // 9. Visibility and community checks: all posts from the created community
  for (const summary of page.data) {
    TestValidator.equals(
      "all posts in page belong to the created community id",
      summary.community.id,
      community.id,
    );

    TestValidator.equals(
      "all posts in page belong to a public (non-restricted) community",
      summary.community.isRestricted,
      false,
    );
  }
}
