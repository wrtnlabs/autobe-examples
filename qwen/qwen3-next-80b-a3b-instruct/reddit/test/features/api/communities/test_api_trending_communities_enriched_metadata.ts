import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunity";
export async function test_api_trending_communities_enriched_metadata(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageICommunityBbsCommunity =
    await api.functional.communityBbs.analytics.communities.trending.index(
      connection,
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate communities data
  TestValidator.predicate(
    "communities array exists",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "communities array has items",
    response.data.length > 0,
  );
  // Track unique IDs to detect duplicates
  const seenIds = new Set<string>();
  for (const community of response.data) {
    // Validate required fields
    const enrichedCommunity = typia.assert<{
      id: string;
      name: string;
      description: string;
      trending_score: number;
      subscriber_count: number;
      last_updated: string;
      category: {
        id: string;
        name: string;
      };
      creator: {
        id: string;
        name: string;
        reputation: number;
      };
    }>(community);
    
    TestValidator.equals("community id exists", typeof enrichedCommunity.id, "string");
    TestValidator.equals(
      "community name exists",
      typeof enrichedCommunity.name,
      "string",
    );
    TestValidator.predicate(
      "community name is not empty",
      enrichedCommunity.name.length > 0,
    );
    TestValidator.equals(
      "community description exists",
      typeof enrichedCommunity.description,
      "string",
    );
    TestValidator.equals(
      "community trending_score exists",
      typeof enrichedCommunity.trending_score,
      "number",
    );
    TestValidator.predicate(
      "community trending_score is positive",
      enrichedCommunity.trending_score > 0,
    );
    TestValidator.equals(
      "community subscriber_count exists",
      typeof enrichedCommunity.subscriber_count,
      "number",
    );
    TestValidator.predicate(
      "community subscriber_count is non-negative",
      enrichedCommunity.subscriber_count >= 0,
    );
    TestValidator.equals(
      "community last_updated exists",
      typeof enrichedCommunity.last_updated,
      "string",
    );
    // Validate enrichment fields (name, description, subscriber_count should be non-empty and properly joined)
    TestValidator.predicate(
      "community name is enriched",
      enrichedCommunity.name.length > 0,
    );
    TestValidator.predicate(
      "community description is enriched",
      enrichedCommunity.description.length > 0,
    );
    TestValidator.predicate(
      "community subscriber_count is enriched",
      enrichedCommunity.subscriber_count > 0,
    );
    // Validate category and creator exist
    TestValidator.equals(
      "community category id exists",
      typeof enrichedCommunity.category.id,
      "string",
    );
    TestValidator.equals(
      "community category name exists",
      typeof enrichedCommunity.category.name,
      "string",
    );
    TestValidator.predicate(
      "community category name is not empty",
      enrichedCommunity.category.name.length > 0,
    );
    TestValidator.equals(
      "community creator id exists",
      typeof enrichedCommunity.creator.id,
      "string",
    );
    TestValidator.equals(
      "community creator name exists",
      typeof enrichedCommunity.creator.name,
      "string",
    );
    TestValidator.predicate(
      "community creator name is not empty",
      enrichedCommunity.creator.name.length > 0,
    );
    TestValidator.equals(
      "community creator reputation exists",
      typeof enrichedCommunity.creator.reputation,
      "number",
    );
    TestValidator.predicate(
      "community creator reputation is non-negative",
      enrichedCommunity.creator.reputation >= 0,
    );
    // Check for duplicates
    TestValidator.predicate(
      "community id is unique",
      !seenIds.has(enrichedCommunity.id),
    );
    seenIds.add(enrichedCommunity.id);
  }
}