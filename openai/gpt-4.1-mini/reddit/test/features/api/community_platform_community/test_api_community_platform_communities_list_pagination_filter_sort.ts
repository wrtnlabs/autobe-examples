import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_communities_list_pagination_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test retrieving the first page of communities with default pagination (page 1, default limit).
  const firstPageResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(firstPageResponse);
  // Validate basic pagination metadata and that data is array
  TestValidator.predicate(
    "first page data is array",
    Array.isArray(firstPageResponse.data),
  );
  TestValidator.predicate(
    "first page data length positive",
    firstPageResponse.data.length >= 0,
  );
  TestValidator.equals(
    "first page current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit positive",
    firstPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page pages zero or positive",
    firstPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page records non-negative",
    firstPageResponse.pagination.records >= 0,
  );
  // Sanity check: data length cannot exceed limit
  TestValidator.predicate(
    "first page data length <= limit",
    firstPageResponse.data.length <= firstPageResponse.pagination.limit,
  );
  // Sanity check: pages * limit >= records
  TestValidator.predicate(
    "pages * limit >= records",
    firstPageResponse.pagination.pages * firstPageResponse.pagination.limit >=
      firstPageResponse.pagination.records,
  );
  // 2. Test filtered request by name property with arbitrary string
  // Note: name property is not defined in DTO, but request can include it to test filter
  const filterRequestBody: ICommunityPlatformCommunity.IRequest = {
    name: "test", // Property might be ignored by the compiler but allowed in request
  } as any;
  const filterResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: filterRequestBody,
    });
  typia.assert(filterResponse);
  // Validate pagination metadata and data array
  TestValidator.predicate(
    "filter data is array",
    Array.isArray(filterResponse.data),
  );
  TestValidator.predicate(
    "filter data length non-negative",
    filterResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "filter current page positive",
    filterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filter limit positive",
    filterResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "filter pages zero or positive",
    filterResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filter records non-negative",
    filterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filter data length <= limit",
    filterResponse.data.length <= filterResponse.pagination.limit,
  );
  TestValidator.predicate(
    "filter pages times limit >= records",
    filterResponse.pagination.pages * filterResponse.pagination.limit >=
      filterResponse.pagination.records,
  );
  // 3. Test sorted request by subscriber_count descending
  // Note: subscriber_count not in DTO but sort sent in request
  const sortedRequestBody: ICommunityPlatformCommunity.IRequest = {
    sort: ["-subscriber_count"],
  } as any;
  const sortedResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: sortedRequestBody,
    });
  typia.assert(sortedResponse);
  // Validate pagination metadata and data array
  TestValidator.predicate(
    "sorted data is array",
    Array.isArray(sortedResponse.data),
  );
  TestValidator.predicate(
    "sorted data length non-negative",
    sortedResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "sorted current page positive",
    sortedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "sorted limit positive",
    sortedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "sorted pages zero or positive",
    sortedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "sorted records non-negative",
    sortedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "sorted data length <= limit",
    sortedResponse.data.length <= sortedResponse.pagination.limit,
  );
  TestValidator.predicate(
    "sorted pages times limit >= records",
    sortedResponse.pagination.pages * sortedResponse.pagination.limit >=
      sortedResponse.pagination.records,
  );
}
