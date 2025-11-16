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

/**
 * Validate anonymous post listing with public filters on communityPlatform
 * posts index.
 *
 * Business flow:
 *
 * 1. Register a memberUser via /auth/memberUser/join to obtain an authenticated
 *    seeding actor.
 * 2. As this memberUser, create a public community via
 *    /communityPlatform/memberUser/communities.
 * 3. Seed multiple posts in that community via /communityPlatform/memberUser/posts
 *    with varying titles and postType values so that filters and sort modes can
 *    be exercised.
 * 4. From an unauthenticated connection (no Authorization header), call PATCH
 *    /communityPlatform/posts with ICommunityPlatformPost.IRequest containing
 *    communityId and pagination parameters.
 * 5. Assert that pagination metadata reflects the requested page/limit and that
 *    all returned posts belong to the seeded community and are authored by the
 *    seeding member user when authorId filter is applied.
 * 6. Repeat listing with different sort modes and author filters to ensure
 *    server-side filtering and ordering are respected for public, visible
 *    content.
 */
export async function test_api_post_list_by_public_filters(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (seeding actor)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a public community owned by memberUser
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Seed multiple posts in the community with varying post types
  const seedCount = 6;
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < seedCount; ++i) {
    const isLink = i % 2 === 0;
    const createBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Seed post #${i + 1} in ${community.slug}`,
      body: isLink ? undefined : RandomGenerator.paragraph({ sentences: 3 }),
      url: isLink
        ? "https://example.com/" + RandomGenerator.alphaNumeric(8)
        : undefined,
      postType: isLink ? "link" : "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: createBody },
      );
    typia.assert(post);
    posts.push(post);
  }

  // Prepare unauthenticated connection (no Authorization header)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Anonymous listing by communityId with pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestByCommunity = {
    page,
    limit,
    communityId: community.id,
  } satisfies ICommunityPlatformPost.IRequest;

  const pageByCommunity: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(anonymousConnection, {
      body: requestByCommunity,
    });
  typia.assert(pageByCommunity);

  // 5. Validate pagination metadata and that items belong to the community
  const pagination: IPage.IPagination = pageByCommunity.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    limit,
  );

  for (const summary of pageByCommunity.data) {
    typia.assert(summary);
    TestValidator.equals(
      "listed post community id should match filter community id",
      summary.community.id,
      community.id,
    );
    TestValidator.equals(
      "listed post community slug should match community slug",
      summary.community.slug,
      community.slug,
    );
  }

  // 6. Listing filtered additionally by authorId
  const requestByCommunityAndAuthor = {
    page,
    limit,
    communityId: community.id,
    authorId: member.id,
  } satisfies ICommunityPlatformPost.IRequest;

  const pageByCommunityAndAuthor: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(anonymousConnection, {
      body: requestByCommunityAndAuthor,
    });
  typia.assert(pageByCommunityAndAuthor);

  for (const summary of pageByCommunityAndAuthor.data) {
    typia.assert(summary);
    TestValidator.equals(
      "listed post's author should equal seeding member",
      summary.author.id,
      member.id,
    );
    TestValidator.equals(
      "listed post community must still match filtered community",
      summary.community.id,
      community.id,
    );
  }

  // 7. Repeat listing with different sort modes to ensure server respects sort value.
  const sortModes = ["new", "top"] as const;

  for (const sort of sortModes) {
    const requestWithSort = {
      page,
      limit,
      communityId: community.id,
      sort,
    } satisfies ICommunityPlatformPost.IRequest;

    const pageWithSort: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.posts.index(anonymousConnection, {
        body: requestWithSort,
      });
    typia.assert(pageWithSort);

    TestValidator.equals(
      `pagination limit should match request for sort=${sort}`,
      pageWithSort.pagination.limit,
      limit,
    );
    for (const summary of pageWithSort.data) {
      typia.assert(summary);
      TestValidator.equals(
        `post community id should match for sort=${sort}`,
        summary.community.id,
        community.id,
      );
    }
  }
}
