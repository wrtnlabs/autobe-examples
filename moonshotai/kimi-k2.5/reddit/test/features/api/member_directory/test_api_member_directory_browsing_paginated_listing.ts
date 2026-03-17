import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member directory browsing with paginated listing.
 * Verifies that unauthenticated users can retrieve paginated member lists
 * sorted by registration date with proper pagination metadata.
 */
export async function test_api_member_directory_browsing_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Default pagination request - no explicit page or limit
  const requestBody = {
    search: null,
    minKarma: null,
    maxKarma: null,
    role: null,
    page: null,
    limit: null,
  } satisfies IRedditLikeMember.IRequest;
  const response = await api.functional.redditLike.members.index(connection, {
    body: requestBody,
  });
  typia.assert(response);
  // 2. Validate sensitive fields are NOT exposed (security requirement)
  for (const member of response.data) {
    TestValidator.predicate(
      "password_hash is not exposed",
      !("password_hash" in member) &&
        !("passwordHash" in member) &&
        !("password" in member),
    );
  }
  // 3. Validate sorting by registration date (newest first - descending order)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].createdAt);
      const currDate = new Date(response.data[i].createdAt);
      TestValidator.predicate(
        "results sorted by createdAt descending (newest first)",
        prevDate >= currDate,
      );
    }
  }
  // 4. Test pagination boundaries - request a page that exceeds available records
  const totalPages = response.pagination.pages;
  const exceedsPage = totalPages + 1;
  const exceedsRequestBody = {
    search: null,
    minKarma: null,
    maxKarma: null,
    role: null,
    page: exceedsPage,
    limit: null,
  } satisfies IRedditLikeMember.IRequest;
  const exceedsResponse = await api.functional.redditLike.members.index(
    connection,
    {
      body: exceedsRequestBody,
    },
  );
  typia.assert(exceedsResponse);
  // When page exceeds total pages, should return empty data array
  TestValidator.equals(
    "exceed page response has empty data array",
    exceedsResponse.data.length,
    0,
  );
  // 5. Test with specific pagination values (page=1, limit=20)
  const specificLimit = 20;
  const specificRequestBody = {
    search: null,
    minKarma: null,
    maxKarma: null,
    role: null,
    page: 1,
    limit: specificLimit,
  } satisfies IRedditLikeMember.IRequest;
  const specificResponse = await api.functional.redditLike.members.index(
    connection,
    {
      body: specificRequestBody,
    },
  );
  typia.assert(specificResponse);
  // Verify specific pagination is applied
  TestValidator.equals(
    "specific page is 1",
    specificResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "specific limit is applied",
    specificResponse.pagination.limit,
    specificLimit,
  );
}
