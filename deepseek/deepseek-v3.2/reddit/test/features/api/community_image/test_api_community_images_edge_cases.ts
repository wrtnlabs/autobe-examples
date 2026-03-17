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

export async function test_api_community_images_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Non-existent community ID should return appropriate result
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.communityPlatform.images.index(
    connection,
    {
      communityId: nonExistentId,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-existent community returns empty data array",
    emptyResult.data,
    [],
  );
  TestValidator.predicate(
    "pagination shows zero records for non-existent community",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination shows zero pages for non-existent community",
    emptyResult.pagination.pages === 0,
  );
  // Test 2: Community with no images should return empty array with pagination
  // Using the same non-existent ID since we can't create communities
  const communityWithNoImages =
    await api.functional.communityPlatform.images.index(connection, {
      communityId: nonExistentId,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    });
  typia.assert(communityWithNoImages);
  TestValidator.equals(
    "community with no images returns empty data",
    communityWithNoImages.data,
    [],
  );
  TestValidator.predicate(
    "pagination shows zero records for community with no images",
    communityWithNoImages.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination shows zero pages for community with no images",
    communityWithNoImages.pagination.pages === 0,
  );
  // Test 3: Pagination boundaries - page beyond available records
  const pageBeyond = await api.functional.communityPlatform.images.index(
    connection,
    {
      communityId: nonExistentId,
      body: {
        page: 1000,
        limit: 10,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond records returns empty data",
    pageBeyond.data,
    [],
  );
  TestValidator.predicate(
    "pagination shows correct page for page beyond records",
    pageBeyond.pagination.current === 1000,
  );
  TestValidator.predicate(
    "pagination shows correct limit for page beyond records",
    pageBeyond.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination shows zero records for page beyond records",
    pageBeyond.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination shows zero pages for page beyond records",
    pageBeyond.pagination.pages === 0,
  );
  // Test 4: Valid pagination parameters within bounds
  const limit1 = await api.functional.communityPlatform.images.index(
    connection,
    {
      communityId: nonExistentId,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(limit1);
  TestValidator.predicate(
    "limit=1 sets correct pagination limit",
    limit1.pagination.limit === 1,
  );
  TestValidator.predicate(
    "page=1 sets correct pagination current",
    limit1.pagination.current === 1,
  );
  const limit100 = await api.functional.communityPlatform.images.index(
    connection,
    {
      communityId: nonExistentId,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(limit100);
  TestValidator.predicate(
    "limit=100 sets correct pagination limit",
    limit100.pagination.limit === 100,
  );
  TestValidator.predicate(
    "page=1 sets correct pagination current",
    limit100.pagination.current === 1,
  );
  // Test 5: Concurrent requests for data consistency
  const concurrentRequests = [
    api.functional.communityPlatform.images.index(connection, {
      communityId: nonExistentId,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    }),
    api.functional.communityPlatform.images.index(connection, {
      communityId: nonExistentId,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    }),
    api.functional.communityPlatform.images.index(connection, {
      communityId: nonExistentId,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    }),
  ];
  const results = await Promise.all(concurrentRequests);
  results.forEach((result) => typia.assert(result));
  // Verify all concurrent requests return same pagination metadata
  for (let i = 1; i < results.length; i++) {
    TestValidator.equals(
      `concurrent request ${i} pagination matches first request`,
      results[0].pagination,
      results[i].pagination,
    );
  }
  // Test 6: Image metadata validation (when images exist)
  // Note: We cannot create images with the current SDK, so we can only test
  // the response structure when there are images. Since we're using a
  // non-existent community ID, we'll always get empty results.
  // The response validation is handled by typia.assert which ensures:
  // - width/height are positive integers (int32)
  // - sizeBytes is integer (int32)
  // - contentType is string
  // - ordering is integer (int32)
  // - active is boolean
  // - createdAt is valid date-time format
  // - community is ICommunityPlatformCommunity.ISummary
  // This validation happens automatically via typia.assert
}
