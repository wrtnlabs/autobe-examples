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

export async function test_api_post_list_respects_visibility_and_status(
  connection: api.IConnection,
) {
  /**
   * Validate that anonymous post listings respect community visibility rules.
   *
   * Business flow:
   *
   * 1. Register a memberUser (authenticated owner of communities and posts).
   * 2. Create a public community (visibility "public").
   * 3. Create a restricted community (visibility "restricted").
   * 4. Seed several posts into both communities as the memberUser.
   * 5. Create an anonymous connection (no Authorization header).
   * 6. As anonymous caller, list posts:
   *
   *    - Filtered by the public community.
   *    - Filtered by the restricted community.
   *    - Without any community filter (global listing).
   * 7. Assert:
   *
   *    - Public listing contains only posts from the public community and includes
   *         at least one of the created public posts.
   *    - Restricted listing and global listing do not leak posts from the restricted
   *         community when called anonymously.
   */

  // 1. Register a member user and obtain authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create a public community.
  const publicCommunityBody = {
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

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: publicCommunityBody },
    );
  typia.assert(publicCommunity);

  // 3. Create a restricted community.
  const restrictedCommunityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "restricted",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const restrictedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: restrictedCommunityBody },
    );
  typia.assert(restrictedCommunity);

  // Helper to create multiple posts in a given community.
  const createPostsInCommunity = async (
    community: ICommunityPlatformCommunity,
    count: number,
  ): Promise<ICommunityPlatformPost[]> => {
    const posts: ICommunityPlatformPost[] = [];
    for (let i = 0; i < count; i += 1) {
      const createBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: createBody },
        );
      typia.assert(post);
      posts.push(post);
    }
    return posts;
  };

  // 4. Seed posts into both communities.
  const PUBLIC_POST_COUNT = 3;
  const RESTRICTED_POST_COUNT = 3;

  const publicPosts: ICommunityPlatformPost[] = await createPostsInCommunity(
    publicCommunity,
    PUBLIC_POST_COUNT,
  );
  const restrictedPosts: ICommunityPlatformPost[] =
    await createPostsInCommunity(restrictedCommunity, RESTRICTED_POST_COUNT);

  const publicPostIds = publicPosts.map((p) => p.id);
  const restrictedPostIds = restrictedPosts.map((p) => p.id);

  // 5. Prepare an anonymous connection (no Authorization header).
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  // 6.1 List posts filtered to the public community as an anonymous user.
  const publicList: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(anonymousConnection, {
      body: {
        page: 1,
        limit: 50,
        communityId: publicCommunity.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(publicList);

  // All posts in the listing should belong to the public community id.
  TestValidator.predicate(
    "public listing only contains posts from the public community",
    publicList.data.every(
      (summary) => summary.community.id === publicCommunity.id,
    ),
  );

  // Ensure at least one of the created public posts is present in the listing.
  TestValidator.predicate(
    "public listing includes at least one created public post",
    publicList.data.some((summary) => publicPostIds.includes(summary.id)),
  );

  // 6.2 List posts filtered to the restricted community as an anonymous user.
  const restrictedList: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(anonymousConnection, {
      body: {
        page: 1,
        limit: 50,
        communityId: restrictedCommunity.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(restrictedList);

  // Anonymous listing should not surface any of the created restricted posts.
  TestValidator.predicate(
    "restricted community listing for anonymous user does not contain created restricted posts",
    restrictedList.data.every(
      (summary) => !restrictedPostIds.includes(summary.id),
    ),
  );

  // 6.3 Global listing without community filters as an anonymous user.
  const globalList: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(anonymousConnection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(globalList);

  // Global listing must not leak posts from the restricted community.
  TestValidator.predicate(
    "global listing does not leak restricted community posts",
    globalList.data.every((summary) => !restrictedPostIds.includes(summary.id)),
  );

  // Global listing should contain at least one public community post.
  TestValidator.predicate(
    "global listing contains at least one public community post",
    globalList.data.some(
      (summary) => summary.community.id === publicCommunity.id,
    ),
  );
}
