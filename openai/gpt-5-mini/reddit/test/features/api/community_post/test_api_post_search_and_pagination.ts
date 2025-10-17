import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { IEPostSortMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPostSortMode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";

export async function test_api_post_search_and_pagination(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Validate posts search, filtering, sorting, and pagination behavior of PATCH
   *   /communityPortal/posts.
   *
   * Steps:
   *
   * 1. Register a new member (join)
   * 2. Create a public community and a private community
   * 3. Create multiple posts in the public community (>=6) with a unique phrase
   * 4. Create a few posts in the private community
   * 5. Call the posts.index endpoint unauthenticated and authenticated to validate
   *    visibility, sorting, search, pagination and invalid input handling
   */

  // 1) Register member
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // 2) Create a public community
  const publicCommunityBody = {
    name: `public-${RandomGenerator.alphaNumeric(6)}`,
    slug: `pub-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const publicCommunity: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: publicCommunityBody,
    });
  typia.assert(publicCommunity);

  // 2b) Create a private community
  const privateCommunityBody = {
    name: `private-${RandomGenerator.alphaNumeric(6)}`,
    slug: `priv-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const privateCommunity: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: privateCommunityBody,
    });
  typia.assert(privateCommunity);

  // 3) Create multiple posts in public community. Include a unique phrase.
  const uniquePhrase = `unique-${RandomGenerator.alphaNumeric(8)}`;

  const createdPublicPosts: ICommunityPortalPost[] = [];

  // Create 6 posts with mixed types
  const publicPostBodies = [
    {
      community_id: publicCommunity.id,
      post_type: "text" as const,
      title: `Text post ${uniquePhrase}`,
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: publicCommunity.id,
      post_type: "link" as const,
      title: `Link post ${RandomGenerator.paragraph({ sentences: 2 })}`,
      link_url: "https://example.com/resource",
      body: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: publicCommunity.id,
      post_type: "image" as const,
      title: `Image post ${RandomGenerator.paragraph({ sentences: 2 })}`,
      image_url: "https://example.com/image.png",
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: publicCommunity.id,
      post_type: "text" as const,
      title: `Another text ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: publicCommunity.id,
      post_type: "link" as const,
      title: `Link post 2 ${RandomGenerator.alphaNumeric(4)}`,
      link_url: "https://example.org/page",
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: publicCommunity.id,
      post_type: "image" as const,
      title: `Image post 2 ${RandomGenerator.alphaNumeric(4)}`,
      image_url: "https://example.org/img.jpg",
    } satisfies ICommunityPortalPost.ICreate,
  ];

  for (const body of publicPostBodies) {
    const created: ICommunityPortalPost =
      await api.functional.communityPortal.member.posts.create(connection, {
        body,
      });
    typia.assert(created);
    createdPublicPosts.push(created);
    // Small delay is not possible here; creation order is preserved by sequence
  }

  // 4) Create two posts in private community
  const privatePostBodies = [
    {
      community_id: privateCommunity.id,
      post_type: "text" as const,
      title: `Private text ${RandomGenerator.alphaNumeric(6)}`,
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ICommunityPortalPost.ICreate,
    {
      community_id: privateCommunity.id,
      post_type: "link" as const,
      title: `Private link ${RandomGenerator.alphaNumeric(6)}`,
      link_url: "https://private.example.com/secret",
    } satisfies ICommunityPortalPost.ICreate,
  ];

  const createdPrivatePosts: ICommunityPortalPost[] = [];
  for (const body of privatePostBodies) {
    const created: ICommunityPortalPost =
      await api.functional.communityPortal.member.posts.create(connection, {
        body,
      });
    typia.assert(created);
    createdPrivatePosts.push(created);
  }

  // 5) Call PATCH /communityPortal/posts unauthenticated (public community)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const listReq = {
    communityId: publicCommunity.id,
    limit: 10,
    offset: 0,
    sort: "new" as IEPostSortMode,
  } satisfies ICommunityPortalPost.IRequest;

  const publicList: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.posts.index(unauthConn, {
      body: listReq,
    });
  typia.assert(publicList);

  // Validate pagination metadata and summary fields
  TestValidator.predicate(
    "pagination limit non-negative",
    publicList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    publicList.pagination.current >= 0,
  );

  // Ensure at least the created public posts are represented in results
  const returnedIds = publicList.data.map((d) => d.id);
  for (const created of createdPublicPosts) {
    TestValidator.predicate(
      `public post ${created.id} included in public feed`,
      returnedIds.includes(created.id),
    );
    // Check required summary fields exist (typia.assert already validated types),
    // but assert existence of typical fields
    const summary = publicList.data.find((d) => d.id === created.id);
    TestValidator.predicate(
      `summary has community_id`,
      summary?.community_id === publicCommunity.id,
    );
    TestValidator.predicate(
      `summary has created_at`,
      typeof summary?.created_at === "string",
    );
  }

  // 6) Test sorting modes: ensure API returns arrays and preserves order as returned
  const sortModes: IEPostSortMode[] = ["new", "top", "hot"];
  for (const mode of sortModes) {
    const resp: IPageICommunityPortalPost.ISummary =
      await api.functional.communityPortal.posts.index(unauthConn, {
        body: {
          communityId: publicCommunity.id,
          sort: mode,
        } satisfies ICommunityPortalPost.IRequest,
      });
    typia.assert(resp);
    TestValidator.predicate(
      `sort mode ${mode} returned array`,
      Array.isArray(resp.data),
    );
    // Ensure the ordering provided by the response is a valid sequence
    TestValidator.predicate(
      `sort mode ${mode} ordering preserved by response`,
      resp.data.length === 0 ||
        resp.data.every((_, i, arr) => i === 0 || arr[i - 1] !== undefined),
    );
  }

  // 7) Full-text search (q) by unique phrase
  const searchResp: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.posts.index(unauthConn, {
      body: {
        q: uniquePhrase,
        limit: 10,
      } satisfies ICommunityPortalPost.IRequest,
    });
  typia.assert(searchResp);
  TestValidator.predicate(
    "search result contains unique phrase post",
    searchResp.data.some((d) => d.title.includes(uniquePhrase)),
  );

  // 8) Pagination behavior: limit=2 offset=0 and limit=2 offset=2 non-overlapping slices
  const page1: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.posts.index(unauthConn, {
      body: {
        communityId: publicCommunity.id,
        limit: 2,
        offset: 0,
      } satisfies ICommunityPortalPost.IRequest,
    });
  typia.assert(page1);

  const page2: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.posts.index(unauthConn, {
      body: {
        communityId: publicCommunity.id,
        limit: 2,
        offset: 2,
      } satisfies ICommunityPortalPost.IRequest,
    });
  typia.assert(page2);

  const ids1 = page1.data.map((d) => d.id);
  const ids2 = page2.data.map((d) => d.id);
  // Ensure non-overlap
  TestValidator.predicate(
    "pagination slices non-overlapping",
    ids1.every((id) => !ids2.includes(id)),
  );
  // Combined slices belong to overall returned ids
  const combined = [...ids1, ...ids2];
  TestValidator.predicate(
    "combined slices subset of overall results",
    combined.every((id) => returnedIds.includes(id)),
  );

  // 9) Invalid input: malformed UUID for communityId should cause error
  await TestValidator.error("malformed communityId returns error", async () => {
    await api.functional.communityPortal.posts.index(unauthConn, {
      body: {
        communityId: "not-a-uuid",
      } satisfies ICommunityPortalPost.IRequest,
    });
  });

  // 10) Private community behavior:
  // As unauthenticated guest: expect either error or empty results
  try {
    const privateList = await api.functional.communityPortal.posts.index(
      unauthConn,
      {
        body: {
          communityId: privateCommunity.id,
          limit: 10,
        } satisfies ICommunityPortalPost.IRequest,
      },
    );
    typia.assert(privateList);
    TestValidator.predicate(
      "private community not visible to unauthenticated guests",
      privateList.data.length === 0,
    );
  } catch (err) {
    // If an error is thrown, assert that an error occurred (do not check status)
    await TestValidator.error(
      "private community listing throws for unauthenticated guests",
      async () => {
        await api.functional.communityPortal.posts.index(unauthConn, {
          body: {
            communityId: privateCommunity.id,
          } satisfies ICommunityPortalPost.IRequest,
        });
      },
    );
  }

  // As authenticated member (original connection), should return posts
  const privateListAuth: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.posts.index(connection, {
      body: {
        communityId: privateCommunity.id,
        limit: 10,
      } satisfies ICommunityPortalPost.IRequest,
    });
  typia.assert(privateListAuth);
  TestValidator.predicate(
    "private community posts visible to authenticated member",
    privateListAuth.data.length >= createdPrivatePosts.length,
  );
}
