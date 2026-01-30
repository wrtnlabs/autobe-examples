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
export async function test_api_trending_communities_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the trending communities endpoint - no parameters allowed
  const response: IPageICommunityBbsCommunity =
    await api.functional.communityBbs.analytics.communities.trending.index(
      connection,
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    () => response.pagination.pages >= 0,
  );
  // Validate each community in the data array
  for (const community of response.data) {
    // Verify required fields exist and have correct types
    TestValidator.predicate(
      "community has string status",
      () => typeof community.status === "string",
    );
    TestValidator.predicate(
      "community has string visibility",
      () => typeof community.visibility === "string",
    );
    TestValidator.predicate(
      "community has string id",
      () => typeof community.id === "string",
    );
    TestValidator.predicate(
      "community has string name",
      () => typeof community.name === "string",
    );
    TestValidator.predicate(
      "community has optional string description",
      () =>
        community.description === undefined ||
        typeof community.description === "string",
    );
    TestValidator.predicate(
      "community has string created_at with date-time format",
      () =>
        community.created_at !== undefined &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
          community.created_at,
        ),
    );
    // Verify name has max 50 characters
    TestValidator.predicate(
      "name length <= 50",
      () => community.name.length <= 50,
    );
    // Verify description max 500 characters (if present)
    if (community.description !== undefined) {
      const description = community.description;
      TestValidator.predicate(
        "description length <= 500",
        () => description.length <= 500,
      );
    }
    // Verify id is UUID format
    TestValidator.predicate("id is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        community.id,
      ),
    );
    // Verify category (ISummary) exists
    TestValidator.predicate(
      "community has valid category",
      () =>
        community.category !== undefined &&
        community.category.id !== undefined &&
        typeof community.category.id === "string" &&
        community.category.name !== undefined &&
        typeof community.category.name === "string",
    );
    // Verify creator (ISummary) exists
    TestValidator.predicate(
      "community has valid creator",
      () =>
        community.creator !== undefined &&
        community.creator.id !== undefined &&
        typeof community.creator.id === "string" &&
        community.creator.name !== undefined &&
        typeof community.creator.name === "string" &&
        community.creator.reputation !== undefined &&
        typeof community.creator.reputation === "number" &&
        community.creator.reputation >= 0,
    );
    // Verify optional fields
    if (community.rules !== undefined) {
      TestValidator.predicate(
        "rules is string",
        () => typeof community.rules === "string",
      );
    }
    if (community.banner_media_id !== undefined) {
      TestValidator.predicate(
        "banner_media_id is string or null",
        () =>
          community.banner_media_id === null ||
          typeof community.banner_media_id === "string",
      );
    }
    if (community.settings !== undefined) {
      TestValidator.predicate(
        "settings is object",
        () =>
          community.settings !== null &&
          typeof community.settings === "object" &&
          !Array.isArray(community.settings),
      );
    }
  }
}
