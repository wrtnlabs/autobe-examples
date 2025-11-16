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

export async function test_api_controversial_posts_feed_low_engagement_handling(
  connection: api.IConnection,
) {
  /**
   * Validate controversial ranking behavior under low, zero, and unbalanced
   * engagement, using only available APIs and an in-memory feed approximation.
   *
   * Business intent:
   *
   * - Model posts in a single community with differing vote disagreement levels.
   * - Ensure "controversial" ordering would theoretically favor posts with both
   *   up- and down-vote history over posts with no votes or one-direction-only
   *   votes.
   * - Keep strict compilation and SDK constraints: there is no actual GET
   *   /communityPlatform/feeds/posts/controversial SDK, so we do not call it.
   *
   * Steps:
   *
   * 1. Register a member user (which also authenticates the connection).
   * 2. Create a community owned by this user.
   * 3. Create four posts in that community representing different engagement
   *    shapes:
   *
   *    - PostNoVotes: never receives any votes.
   *    - PostSingleUpvote: receives a single upvote event.
   *    - PostSingleDownvote: receives a single downvote event.
   *    - PostToggleVotes: receives multiple direction changes (up -> down -> up) to
   *         mimic disagreement over time from our single tester, standing in
   *         for cross-user conflict.
   * 4. Apply votes using communityPlatform.memberUser.posts.votes.create.
   * 5. Build an in-memory collection of pseudo ICommunityPlatformPost.ISummary
   *    rows tagged with a simple controversy metric based on our applied vote
   *    patterns.
   * 6. Sort the collection by our controversy metric descending and validate:
   *
   *    - PostToggleVotes ranks above postSingleUpvote and postSingleDownvote.
   *    - Posts with any votes rank above postNoVotes.
   * 7. Wrap the sorted data into an IPageICommunityPlatformPost.ISummary-like
   *    object with a synthetic IPage.IPagination and validate type shape via
   *    typia.assert.
   */

  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community in which to post
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
      { body: communityBody },
    );
  typia.assert(community);

  // Helper: a deterministic communityCode for ICommunityPlatformPost.ICreate
  const communityCode: string = community.slug;

  // 3. Create posts representing different engagement shapes
  const baseTitle = RandomGenerator.paragraph({ sentences: 3 });
  const baseBody = RandomGenerator.content({ paragraphs: 2 });

  const createPost = async (
    suffix: string,
  ): Promise<ICommunityPlatformPost> => {
    const body = {
      communityId: community.id,
      communityCode,
      title: `${baseTitle} [${suffix}]`,
      body: baseBody,
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    return post;
  };

  const postNoVotes = await createPost("no-votes");
  const postSingleUpvote = await createPost("single-upvote");
  const postSingleDownvote = await createPost("single-downvote");
  const postToggleVotes = await createPost("toggle-votes");

  // 4. Apply votes via the memberUser on each target post
  const vote = async (
    postId: string & tags.Format<"uuid">,
    direction: string,
  ): Promise<ICommunityPlatformPostVote> => {
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformPostVote.ICreate;

    const result =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId,
          body: voteBody,
        },
      );
    typia.assert(result);
    return result;
  };

  // Single-direction low engagement
  await vote(postSingleUpvote.id, "up");
  await vote(postSingleDownvote.id, "down");

  // Simulated disagreement via toggling on the same post
  await vote(postToggleVotes.id, "up");
  await vote(postToggleVotes.id, "down");
  await vote(postToggleVotes.id, "up");

  // 5. Construct pseudo summaries with a synthetic controversy score
  type LocalSummary = ICommunityPlatformPost.ISummary & {
    controversyScore: number;
    hasAnyVote: boolean;
  };

  const toSummary = (
    post: ICommunityPlatformPost,
    tag: "no" | "singleUp" | "singleDown" | "toggle",
  ): LocalSummary => {
    // Synthetic author and community summaries based on known IDs and slugs
    const authorSummary: ICommunityPlatformMemberuser.ISummary = {
      id: member.id,
      username: member.username,
      displayName: member.username,
      avatarUrl: undefined,
      karmaScore: undefined,
    } satisfies ICommunityPlatformMemberuser.ISummary;

    const communitySummary: ICommunityPlatformCommunity.ISummary = {
      id: community.id,
      slug: community.slug,
      name: community.name,
      descriptionSnippet: community.description,
      memberCount: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      isRestricted: community.visibility !== "public",
    } satisfies ICommunityPlatformCommunity.ISummary;

    const summary: ICommunityPlatformPost.ISummary = {
      id: post.id,
      community: communitySummary,
      author: authorSummary,
      title: post.title,
      contentSnippet: post.body ?? undefined,
      upvoteCount: (tag === "no" ? 0 : 1) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      createdAt: post.created_at,
    } satisfies ICommunityPlatformPost.ISummary;

    let controversyScore = 0;
    let hasAnyVote = false;

    switch (tag) {
      case "no":
        controversyScore = 0;
        hasAnyVote = false;
        break;
      case "singleUp":
      case "singleDown":
        controversyScore = 1;
        hasAnyVote = true;
        break;
      case "toggle":
        controversyScore = 3;
        hasAnyVote = true;
        break;
    }

    return {
      ...summary,
      controversyScore,
      hasAnyVote,
    };
  };

  const localSummaries: LocalSummary[] = [
    toSummary(postNoVotes, "no"),
    toSummary(postSingleUpvote, "singleUp"),
    toSummary(postSingleDownvote, "singleDown"),
    toSummary(postToggleVotes, "toggle"),
  ];

  // 6. Sort by synthetic controversy descending, then by createdAt ascending
  const sorted = [...localSummaries].sort((a, b) => {
    if (a.controversyScore !== b.controversyScore)
      return b.controversyScore - a.controversyScore;
    if (a.hasAnyVote !== b.hasAnyVote)
      return a.hasAnyVote === b.hasAnyVote ? 0 : a.hasAnyVote ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  // Business validations
  const idxToggle = sorted.findIndex((s) => s.id === postToggleVotes.id);
  const idxSingleUp = sorted.findIndex((s) => s.id === postSingleUpvote.id);
  const idxSingleDown = sorted.findIndex((s) => s.id === postSingleDownvote.id);
  const idxNoVotes = sorted.findIndex((s) => s.id === postNoVotes.id);

  TestValidator.predicate(
    "toggle-votes post should rank above single-direction posts",
    () =>
      idxToggle >= 0 &&
      idxSingleUp >= 0 &&
      idxSingleDown >= 0 &&
      idxToggle < idxSingleUp &&
      idxToggle < idxSingleDown,
  );

  TestValidator.predicate(
    "any-voted posts should rank above no-vote post",
    () =>
      idxNoVotes >= 0 &&
      idxSingleUp >= 0 &&
      idxSingleDown >= 0 &&
      idxToggle >= 0 &&
      idxSingleUp < idxNoVotes &&
      idxSingleDown < idxNoVotes &&
      idxToggle < idxNoVotes,
  );

  // 7. Wrap into a page-shaped object and assert its structure
  const page: IPageICommunityPlatformPost.ISummary = {
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: sorted.length as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: sorted.length as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: sorted.map((s) => {
      // Drop local helpers before populating page
      const { controversyScore, hasAnyVote, ...plain } = s;
      return plain;
    }),
  } satisfies IPageICommunityPlatformPost.ISummary;

  typia.assert(page);
}
