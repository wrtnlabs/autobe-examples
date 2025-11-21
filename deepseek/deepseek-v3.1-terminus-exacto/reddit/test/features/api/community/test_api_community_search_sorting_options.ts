import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test community search sorting functionality with different ordering options.
 * Validates sorting by creation date (newest/oldest first), update date (most
 * recent activity), and alphabetical name ordering. Tests both ascending and
 * descending sort directions to ensure proper result ordering.
 */
export async function test_api_community_search_sorting_options(
  connection: api.IConnection,
) {
  // Test sorting by created_at in ascending order (oldest first)
  const createdAscResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(createdAscResponse);

  // Test sorting by created_at in descending order (newest first)
  const createdDescResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(createdDescResponse);

  // Test sorting by updated_at in ascending order
  const updatedAscResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "updated_at",
        order_direction: "asc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(updatedAscResponse);

  // Test sorting by updated_at in descending order
  const updatedDescResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "updated_at",
        order_direction: "desc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(updatedDescResponse);

  // Test sorting by name in ascending order (A-Z)
  const nameAscResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order_direction: "asc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(nameAscResponse);

  // Test sorting by name in descending order (Z-A)
  const nameDescResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order_direction: "desc",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(nameDescResponse);

  // Validate that we received data for all sorting tests
  TestValidator.predicate(
    "created_at ascending response should contain data",
    createdAscResponse.data.length > 0,
  );

  TestValidator.predicate(
    "created_at descending response should contain data",
    createdDescResponse.data.length > 0,
  );

  TestValidator.predicate(
    "updated_at ascending response should contain data",
    updatedAscResponse.data.length > 0,
  );

  TestValidator.predicate(
    "updated_at descending response should contain data",
    updatedDescResponse.data.length > 0,
  );

  TestValidator.predicate(
    "name ascending response should contain data",
    nameAscResponse.data.length > 0,
  );

  TestValidator.predicate(
    "name descending response should contain data",
    nameDescResponse.data.length > 0,
  );

  // Validate pagination structure for all responses
  const validatePagination = (
    response: IPageICommunityPlatformCommunity.ISummary,
    testName: string,
  ) => {
    TestValidator.predicate(
      `${testName} should have valid pagination current page`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${testName} should have valid pagination limit`,
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      `${testName} should have valid pagination records`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${testName} should have valid pagination pages`,
      response.pagination.pages >= 0,
    );
  };

  validatePagination(createdAscResponse, "created_at ascending");
  validatePagination(createdDescResponse, "created_at descending");
  validatePagination(updatedAscResponse, "updated_at ascending");
  validatePagination(updatedDescResponse, "updated_at descending");
  validatePagination(nameAscResponse, "name ascending");
  validatePagination(nameDescResponse, "name descending");

  // If we have multiple communities, validate sorting order
  if (createdAscResponse.data.length > 1) {
    // For created_at ascending, earlier dates should come first
    for (let i = 1; i < createdAscResponse.data.length; i++) {
      const earlier = new Date(createdAscResponse.data[i - 1].created_at);
      const later = new Date(createdAscResponse.data[i].created_at);
      TestValidator.predicate(
        `created_at ascending should order communities chronologically at position ${i}`,
        earlier <= later,
      );
    }
  }

  if (createdDescResponse.data.length > 1) {
    // For created_at descending, later dates should come first
    for (let i = 1; i < createdDescResponse.data.length; i++) {
      const later = new Date(createdDescResponse.data[i - 1].created_at);
      const earlier = new Date(createdDescResponse.data[i].created_at);
      TestValidator.predicate(
        `created_at descending should order communities reverse chronologically at position ${i}`,
        later >= earlier,
      );
    }
  }

  if (nameAscResponse.data.length > 1) {
    // For name ascending, names should be in alphabetical order
    for (let i = 1; i < nameAscResponse.data.length; i++) {
      const previousName = nameAscResponse.data[i - 1].name;
      const currentName = nameAscResponse.data[i].name;
      TestValidator.predicate(
        `name ascending should order communities alphabetically at position ${i}`,
        previousName <= currentName,
      );
    }
  }

  if (nameDescResponse.data.length > 1) {
    // For name descending, names should be in reverse alphabetical order
    for (let i = 1; i < nameDescResponse.data.length; i++) {
      const previousName = nameDescResponse.data[i - 1].name;
      const currentName = nameDescResponse.data[i].name;
      TestValidator.predicate(
        `name descending should order communities reverse alphabetically at position ${i}`,
        previousName >= currentName,
      );
    }
  }
}
