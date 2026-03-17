import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_unified_filter_by_community_type(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search filtered to only communities
  const communitySearch = await api.functional.communityPlatform.search.unified(
    connection,
    {
      body: {
        search: "programming",
        entityTypes: ["community"],
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IUnified,
    },
  );
  typia.assert(communitySearch);
  // Type-safe community detection
  const isCommunity = (
    item: any,
  ): item is ICommunityPlatformCommunity.ISummary => {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "name" in item &&
      "description" in item &&
      "owner" in item &&
      "subscriber_count" in item
    );
  };
  const isPost = (item: any): item is ICommunityPlatformPost.ISummary => {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "title" in item &&
      "author" in item &&
      "community" in item &&
      "vote_score" in item &&
      "comment_count" in item
    );
  };
  const isUser = (item: any): item is ICommunityPlatformMember.ISummary => {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "email" in item &&
      "username" in item &&
      "registered_at" in item
    );
  };
  // Validate that all results are communities
  TestValidator.predicate(
    "only communities in filtered search",
    (communitySearch.data as unknown as any[]).every((item: unknown) => isCommunity(item as any)),
  );
  // Test 2: Empty entityTypes array (should search all types)
  const allTypesSearch = await api.functional.communityPlatform.search.unified(
    connection,
    {
      body: {
        search: "programming",
        entityTypes: [],
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IUnified,
    },
  );
  typia.assert(allTypesSearch);
  // Validate empty entityTypes may return mixed results
  TestValidator.predicate(
    "empty entityTypes returns valid results",
    (allTypesSearch.data as unknown as any[]).every(
      (item: unknown) => isCommunity(item as any) || isPost(item as any) || isUser(item as any),
    ),
  );
  // Test 3: Multiple entity types filter
  const multiTypeSearch = await api.functional.communityPlatform.search.unified(
    connection,
    {
      body: {
        search: "programming",
        entityTypes: ["community", "post"],
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IUnified,
    },
  );
  typia.assert(multiTypeSearch);
  // Validate only communities and posts are returned
  TestValidator.predicate(
    "only communities and posts in multi-type search",
    (multiTypeSearch.data as unknown as any[]).every((item: unknown) => isCommunity(item as any) || isPost(item as any)),
  );
  // Validate no users in multi-type search
  TestValidator.predicate(
    "no users in community+post filtered search",
    (multiTypeSearch.data as unknown as any[]).every((item: unknown) => !isUser(item as any)),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    communitySearch.pagination.page === 1 &&
      communitySearch.pagination.limit === 10 &&
      communitySearch.pagination.total_count >= 0 &&
      communitySearch.pagination.total_pages >= 0,
  );
}