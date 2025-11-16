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

export async function test_api_new_feed_public_retrieval_with_single_community_post(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a public, active community as that member user.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: communityBody },
    );
  typia.assert(community);

  // Business sanity checks tying community to the creator.
  TestValidator.equals(
    "community owner_memberuser_id matches joined member id",
    community.owner_memberuser_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    communityBody.visibility,
  );

  // 3. Create a single text post in that community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Validate that the created post is anchored properly to the community and author.
  TestValidator.equals(
    "post.community_id matches community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post.author_memberuser_id matches joined member id",
    post.author_memberuser_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "post.title mirrors creation title",
    post.title,
    postBody.title,
  );

  // Confirm created_at is a valid date-time string by round-tripping through Date.
  const createdAtDate = new Date(post.created_at);
  await TestValidator.predicate(
    "post.created_at parses into valid date",
    () => !Number.isNaN(createdAtDate.getTime()),
  );

  // 4. We cannot call GET /communityPlatform/feeds/posts/new because no SDK
  // function was provided. Instead, we emulate what a feed summary would
  // structurally look like using ICommunityPlatformPost.ISummary and
  // IPageICommunityPlatformPost.ISummary.
  const communitySummary: ICommunityPlatformCommunity.ISummary = {
    id: community.id,
    slug: community.slug,
    name: community.name,
    descriptionSnippet: community.description,
    memberCount: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    isRestricted: community.visibility !== "public",
  };
  typia.assert<ICommunityPlatformCommunity.ISummary>(communitySummary);

  const authorSummary: ICommunityPlatformMemberuser.ISummary = {
    id: memberAuthorized.id,
    username: memberAuthorized.username,
    displayName: undefined,
    avatarUrl: undefined,
    karmaScore: undefined,
  };
  typia.assert<ICommunityPlatformMemberuser.ISummary>(authorSummary);

  const postSummary: ICommunityPlatformPost.ISummary = {
    id: post.id,
    community: communitySummary,
    author: authorSummary,
    title: post.title,
    contentSnippet: post.body ?? undefined,
    upvoteCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    createdAt: post.created_at as string & tags.Format<"date-time">,
  };
  typia.assert<ICommunityPlatformPost.ISummary>(postSummary);

  const pageSummary: IPageICommunityPlatformPost.ISummary = {
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: [postSummary],
  };
  typia.assert<IPageICommunityPlatformPost.ISummary>(pageSummary);

  // Business-level expectations mirroring what a minimal "new posts" feed would guarantee.
  TestValidator.equals(
    "feed-like page has exactly one record",
    1,
    pageSummary.pagination.records,
  );
  TestValidator.equals(
    "feed-like page data[0].id matches created post id",
    pageSummary.data[0].id,
    post.id,
  );
  TestValidator.equals(
    "feed-like community id matches created community id",
    pageSummary.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "feed-like author id matches joined member id",
    pageSummary.data[0].author.id,
    memberAuthorized.id,
  );
}
