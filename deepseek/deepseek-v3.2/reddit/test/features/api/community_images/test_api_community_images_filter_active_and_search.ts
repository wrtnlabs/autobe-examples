import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_images_filter_active_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create communities or images with available APIs,
  // we must test with existing data. We'll use the API with random
  // communityId to test the endpoint functionality.
  // Create actor connection (same as base for this endpoint)
  const actorConnection: api.IConnection = { host: connection.host };
  // Generate random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by active status
  const activeOnlyResponse =
    await api.functional.communityPlatform.images.index(actorConnection, {
      communityId,
      body: {
        active: true,
        limit: 100,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // Validate response structure
  TestValidator.predicate(
    "response should have pagination and data arrays",
    activeOnlyResponse.pagination !== undefined &&
      Array.isArray(activeOnlyResponse.data),
  );
  // Validate all returned images are active (if any exist)
  if (activeOnlyResponse.data.length > 0) {
    TestValidator.predicate(
      "all images should be active when filtered by active=true",
      activeOnlyResponse.data.every((img) => img.active === true),
    );
  }
  // Test 2: Filename search
  const searchTerm = RandomGenerator.alphabets(3);
  const searchResponse = await api.functional.communityPlatform.images.index(
    actorConnection,
    {
      communityId,
      body: {
        search: searchTerm,
        limit: 100,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Test 3: Combined filtering
  const combinedResponse = await api.functional.communityPlatform.images.index(
    actorConnection,
    {
      communityId,
      body: {
        search: searchTerm,
        active: true,
        limit: 100,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Test 4: Ordering range filtering
  const minOrdering = typia.random<number & tags.Type<"int32">>();
  const maxOrdering = minOrdering + 10;
  const orderingResponse = await api.functional.communityPlatform.images.index(
    actorConnection,
    {
      communityId,
      body: {
        minOrdering,
        maxOrdering,
        limit: 100,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(orderingResponse);
  // Validate ordering range if images exist
  if (orderingResponse.data.length > 0) {
    TestValidator.predicate(
      "images should be within ordering range",
      orderingResponse.data.every(
        (img) => img.ordering >= minOrdering && img.ordering <= maxOrdering,
      ),
    );
  }
  // Test 5: Pagination with filtering
  const paginatedResponse = await api.functional.communityPlatform.images.index(
    actorConnection,
    {
      communityId,
      body: {
        active: true,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid metadata",
    paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 5 &&
      paginatedResponse.pagination.records >= 0 &&
      paginatedResponse.pagination.pages >= 0,
  );
  // Validate data length doesn't exceed limit
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedResponse.data.length <= 5,
  );
}
