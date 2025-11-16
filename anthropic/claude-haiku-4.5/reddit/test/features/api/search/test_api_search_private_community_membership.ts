import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_private_community_membership(
  connection: api.IConnection,
) {
  // Step 1: Create member who is private community owner/member
  const memberOwner: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberOwner);

  // Step 2: Create member who is not in private community
  const memberNonMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberNonMember);

  // Switch to owner member context
  connection.headers ??= {};
  connection.headers.Authorization = memberOwner.token.access;

  // Step 3: Create private community by owner
  const privateCategory: ICommunityPlatformCategory.ISummary =
    typia.random<ICommunityPlatformCategory.ISummary>();
  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `PrivateCommunity_${RandomGenerator.alphabets(6)}`,
          identifier: `private_${RandomGenerator.alphabets(8)}`,
          description: "This is a private community for testing",
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: privateCategory.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community visibility is private",
    privateCommunity.visibility,
    "private",
  );

  // Step 4: Create posts in private community
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: privateCommunity.id,
          post_type: "text",
          title: `Private Post ${i + 1} - SearchKeyword`,
          content_text: `This is a private post with unique search content ${RandomGenerator.paragraph()}`,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 5: Search as non-member user
  connection.headers.Authorization = memberNonMember.token.access;

  const nonMemberSearchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "SearchKeyword",
        page: 1,
        limit: 50,
        community: [privateCommunity.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(nonMemberSearchResult);
  TestValidator.equals(
    "non-member should not see private community posts",
    nonMemberSearchResult.data.length,
    0,
  );

  // Step 6: Search as private community member
  connection.headers.Authorization = memberOwner.token.access;

  const memberSearchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "SearchKeyword",
        page: 1,
        limit: 50,
        community: [privateCommunity.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(memberSearchResult);
  TestValidator.predicate(
    "member should see private community posts",
    memberSearchResult.data.length >= 3,
  );

  // Step 7: Verify keyword search filtering works correctly
  const keywordSearchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "unique search content",
        page: 1,
        limit: 50,
        community: [privateCommunity.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(keywordSearchResult);
  TestValidator.predicate(
    "filtered search should return posts with matching keywords",
    keywordSearchResult.data.length >= 1,
  );

  // Step 8: Create public community and verify visibility
  const publicCategory: ICommunityPlatformCategory.ISummary =
    typia.random<ICommunityPlatformCategory.ISummary>();
  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `PublicCommunity_${RandomGenerator.alphabets(6)}`,
          identifier: `public_${RandomGenerator.alphabets(8)}`,
          description: "This is a public community for testing",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: publicCategory.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);

  // Create post in public community
  const publicPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: publicCommunity.id,
        post_type: "text",
        title: "Public Post - PublicSearchKeyword",
        content_text: `This is a public post visible to all ${RandomGenerator.paragraph()}`,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(publicPost);

  // Step 9: Search public community content as non-member
  connection.headers.Authorization = memberNonMember.token.access;

  const publicSearchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "PublicSearchKeyword",
        page: 1,
        limit: 50,
        community: [publicCommunity.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(publicSearchResult);
  TestValidator.predicate(
    "non-member should see public community posts",
    publicSearchResult.data.length >= 1,
  );
}
