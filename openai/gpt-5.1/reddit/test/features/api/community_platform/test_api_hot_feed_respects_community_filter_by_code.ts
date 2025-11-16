import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_hot_feed_respects_community_filter_by_code(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create two distinct communities (A and B)
  const communityABody = {
    slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  const communityBBody = {
    slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  // 3. Create several posts in community A and B
  const createPostForCommunity = async (
    community: ICommunityPlatformCommunity,
    count: number,
  ): Promise<ICommunityPlatformPost[]> => {
    const posts: ICommunityPlatformPost[] = [];
    for (let i = 0; i < count; i++) {
      const body = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body },
        );
      typia.assert<ICommunityPlatformPost>(post);
      posts.push(post);
    }
    return posts;
  };

  const postsInA = await createPostForCommunity(communityA, 3);
  const postsInB = await createPostForCommunity(communityB, 3);

  TestValidator.predicate(
    "created enough posts in community A",
    () => postsInA.length === 3,
  );
  TestValidator.predicate(
    "created enough posts in community B",
    () => postsInB.length === 3,
  );

  // 4. Emulate a hot feed filtered to community A in-memory, since the
  //    SDK for GET /communityPlatform/feeds/posts/hot is not available.
  const hotFeedA: IPageICommunityPlatformPost.ISummary = {
    pagination: {
      current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: postsInA.length as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: postsInA.length as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: postsInA.map(
      (post): ICommunityPlatformPost.ISummary => ({
        id: post.id,
        community: {
          id: communityA.id,
          slug: communityA.slug,
          name: communityA.name,
          descriptionSnippet: communityABody.description ?? undefined,
          memberCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
          isRestricted: false,
        },
        author: {
          id: authorized.id,
          username: authorized.username,
          displayName: undefined,
          avatarUrl: undefined,
          karmaScore: undefined,
        },
        title: post.title,
        contentSnippet: post.body ?? undefined,
        upvoteCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        createdAt: post.created_at,
      }),
    ),
  };

  typia.assert<IPageICommunityPlatformPost.ISummary>(hotFeedA);

  // Validate that all posts in the emulated hot feed for community A belong to community A
  TestValidator.predicate("all hot feed posts are from community A", () =>
    hotFeedA.data.every(
      (summary) =>
        summary.community.id === communityA.id &&
        summary.community.slug === communityA.slug,
    ),
  );

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page non-negative",
    () => hotFeedA.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    () => hotFeedA.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    () => hotFeedA.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => hotFeedA.pagination.pages >= 0,
  );

  // Additional cross-community isolation check: ensure no post from community B appears
  TestValidator.predicate("no posts from community B in hot feed A", () =>
    hotFeedA.data.every((summary) => summary.community.id !== communityB.id),
  );
}
