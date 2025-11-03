import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSearch";
import type { ICommunityBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSearchResult";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsSearchResult";

export async function test_api_global_search_excludes_private_for_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * Validate that global search excludes private communities and their posts
   * from unauthenticated callers while allowing members to see them.
   *
   * Steps:
   *
   * 1. Create a community member (creator) via POST /auth/communityMember/join
   * 2. Create a private community as the creator
   * 3. Create a post inside the private community containing a unique phrase
   * 4. As an unauthenticated caller, call PATCH /communityBbs/search/global and
   *    assert the private community/post does NOT appear
   * 5. As the authenticated member, call the same search and assert the private
   *    community/post DOES appear
   */

  // 1) Sign up a new community member (creator)
  const uniqueSuffix = `${Date.now()}-${RandomGenerator.alphaNumeric(6)}`;
  const creatorEmail = `creator-${uniqueSuffix}@example.test`;
  const creatorUsername = `creator_${RandomGenerator.alphaNumeric(6)}`;
  const joinBody = {
    email: creatorEmail,
    username: creatorUsername,
    password: "Passw0rd!",
    profile: { display_name: `Creator ${uniqueSuffix}` },
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const creator: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(creator);

  // 2) Create a private community as the creator
  const communitySlug = `test-community-${uniqueSuffix}`.toLowerCase();
  const communityName = `Test Community ${uniqueSuffix}`;
  const communityCreate = {
    name: communityName,
    slug: communitySlug,
    description: "Private community for search visibility test",
    visibility: "private",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );

  // 3) Create a post inside the private community containing a unique phrase
  const uniquePhrase = `unique-search-phrase-${uniqueSuffix}`;
  const postTitle = `Private post ${uniqueSuffix}`;
  const postCreate = {
    title: postTitle,
    body: `This is a private post that contains the phrase: ${uniquePhrase}`,
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: communitySlug,
        body: postCreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "created post belongs to created community",
    post.community.slug,
    communitySlug,
  );

  // 4) As an unauthenticated caller, perform global search and assert absence
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Search request DTO is typed as `any` in the SDK. To avoid `satisfies any`,
  // pass a plain object shaped { q } (no satisfies) to the search endpoint.
  const publicSearchRequest = { q: uniquePhrase };

  const publicResult: IPageICommunityBbsSearchResult.ISummary =
    await api.functional.communityBbs.search.global.index(unauthConn, {
      body: publicSearchRequest,
    });
  typia.assert(publicResult);

  // Ensure none of the returned hits reference our private community or post
  TestValidator.predicate(
    "public search does not return private community or post",
    publicResult.data.every((hit) => {
      try {
        if (hit.target_type === "community") {
          const c = hit.item as ICommunityBbsCommunity.ISummary;
          return c.slug !== communitySlug;
        }
        if (hit.target_type === "post") {
          const p = hit.item as ICommunityBbsPost.ISummary;
          // If post summary is present, ensure it's not from our private community
          return p.community.slug !== communitySlug && p.title !== postTitle;
        }
        // comments/users etc. are irrelevant for this check
        return true;
      } catch {
        return true;
      }
    }),
  );

  // 5) As the authenticated member (creator), perform the same search and
  //    assert the private items appear in results
  const memberResult: IPageICommunityBbsSearchResult.ISummary =
    await api.functional.communityBbs.search.global.index(connection, {
      body: { q: uniquePhrase },
    });
  typia.assert(memberResult);

  // The member (creator) should be able to see the private community/post in search results
  const memberSeesPrivate = memberResult.data.some((hit) => {
    try {
      if (hit.target_type === "community") {
        const c = hit.item as ICommunityBbsCommunity.ISummary;
        return c.slug === communitySlug;
      }
      if (hit.target_type === "post") {
        const p = hit.item as ICommunityBbsPost.ISummary;
        return p.community.slug === communitySlug || p.title === postTitle;
      }
      return false;
    } catch {
      return false;
    }
  });

  TestValidator.predicate(
    "member search returns private community/post for members",
    memberSeesPrivate,
  );
}
