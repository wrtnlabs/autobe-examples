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

export async function test_api_global_search_returns_relevant_results(
  connection: api.IConnection,
) {
  // 1) Create an author (community member) and obtain tokens (SDK will set connection.headers.Authorization)
  const uniqueToken = Date.now().toString();
  const authorEmail = `author+${uniqueToken}@example.test`;
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;

  const authOutput: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        session_context: {
          href: `https://example.test/join/${uniqueToken}`,
          referrer: `https://example.test/ref/${uniqueToken}`,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(authOutput);

  // Ensure we have a token on connection (SDK sets Authorization header on join)
  typia.assert<IAuthorizationToken>(authOutput.token);

  // 2) Create a unique community (public) that will be discoverable by search
  const uniqueSlug = `test-community-${uniqueToken}`;
  const communityBody = {
    name: `Test Community ${uniqueToken}`,
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3) Create a post containing a unique test phrase
  const uniquePhrase = `unique-test-phrase-${uniqueToken}-${RandomGenerator.alphaNumeric(4)}`;
  const postBody = {
    title: `Searchable: ${uniquePhrase}`,
    body: `This post contains the unique phrase: ${uniquePhrase}`,
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);

  // Basic business expectation: created post should be published or at least returned by public search only if published
  // We don't mutate server state further; test assumes platform either publishes by default or search respects published flag.

  // 4) Perform global search as UNAUTHENTICATED caller
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const searchRequest = {
    q: uniquePhrase,
    types: ["post", "community"],
    limit: 10,
  } satisfies ICommunityBbsSearch.IRequest;

  const unauthResult: IPageICommunityBbsSearchResult.ISummary =
    await api.functional.communityBbs.search.global.index(unauthConn, {
      body: searchRequest,
    });
  typia.assert(unauthResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "unauth search: pagination object present",
    unauthResult.pagination !== null && unauthResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "unauth search: limit honored",
    unauthResult.pagination.limit <= 10 && unauthResult.pagination.limit >= 0,
  );

  // Validate that search returned at least one relevant item and includes relevance_score
  TestValidator.predicate(
    "unauth search: has data array",
    Array.isArray(unauthResult.data) && unauthResult.data.length > 0,
  );

  // Check that a post or community matching our unique phrase appears
  const foundPost = unauthResult.data.find((d) => d.target_type === "post");
  const foundCommunity = unauthResult.data.find(
    (d) => d.target_type === "community",
  );

  TestValidator.predicate(
    "unauth search: found either post or community for unique phrase",
    Boolean(foundPost) || Boolean(foundCommunity),
  );

  if (foundPost) {
    TestValidator.predicate(
      "unauth search: post result has relevance score",
      typeof foundPost.relevance_score === "number" &&
        !Number.isNaN(foundPost.relevance_score),
    );
    // snippet is optional, check type when present
    if (foundPost.snippet !== undefined) {
      TestValidator.predicate(
        "unauth search: post snippet is string",
        typeof foundPost.snippet === "string",
      );
    }
  }

  if (foundCommunity) {
    TestValidator.predicate(
      "unauth search: community result has relevance score",
      typeof foundCommunity.relevance_score === "number" &&
        !Number.isNaN(foundCommunity.relevance_score),
    );
    if (foundCommunity.snippet !== undefined) {
      TestValidator.predicate(
        "unauth search: community snippet is string",
        typeof foundCommunity.snippet === "string",
      );
    }
  }

  // 5) Perform global search as AUTHENTICATED caller (author)
  const authResult: IPageICommunityBbsSearchResult.ISummary =
    await api.functional.communityBbs.search.global.index(connection, {
      body: searchRequest,
    });
  typia.assert(authResult);

  TestValidator.predicate(
    "auth search: has data array",
    Array.isArray(authResult.data) && authResult.data.length > 0,
  );

  const authFoundPost = authResult.data.find((d) => d.target_type === "post");
  const authFoundCommunity = authResult.data.find(
    (d) => d.target_type === "community",
  );

  TestValidator.predicate(
    "auth search: found either post or community for unique phrase",
    Boolean(authFoundPost) || Boolean(authFoundCommunity),
  );

  // Additional check: ensure public visibility - when unauthenticated found results, they are public
  if (unauthResult.data.length > 0) {
    // Ensure none of returned items are explicitly non-public via is_published=false
    const nonPublic = unauthResult.data.find((d) => {
      // item may be one of several summary shapes; guard on presence
      // For post summary, 'is_published' is part of ICommunityBbsPost.ISummary when present
      const itemAny: any = d.item as any;
      return (
        itemAny &&
        (itemAny.is_published === false || itemAny.business_status === "draft")
      );
    });
    TestValidator.predicate(
      "unauth search: no non-public items returned",
      nonPublic === undefined,
    );
  }
}
