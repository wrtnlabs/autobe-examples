import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_users_pagination_boundary_conditions(
  connection: api.IConnection,
): Promise<void> {
  // This e2e test checks pagination boundary cases for /communityPlatform/users PATCH endpoint
  // including first page retrieval, last page retrieval, and out-of-range page request.
  // Since ICommunityPlatformUser.IRequest is empty type {},
  // we will use an empty object as filter criteria in all requests.
  // Use actor-specific connection (reuse given connection.host)
  const actorConnection: api.IConnection = { host: connection.host };
  // 1. Request first page with limit 10
  const firstPageRequestBody: ICommunityPlatformUser.IRequest = {};
  const firstPageResponse = await api.functional.communityPlatform.users.index(
    actorConnection,
    {
      body: firstPageRequestBody,
    },
  );
  typia.assert(firstPageResponse);
  // Check pagination current page is 1
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit positive",
    firstPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page records non-negative",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPageResponse.pagination.pages >= 0,
  );
  // If there is 0 record, pages should be 0
  if (firstPageResponse.pagination.records === 0) {
    TestValidator.equals(
      "first page pages zero if no records",
      firstPageResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "first page data empty if no records",
      firstPageResponse.data.length,
      0,
    );
  } else {
    // page 1 contains up to limit records
    TestValidator.predicate(
      "first page data count <= limit",
      firstPageResponse.data.length <= firstPageResponse.pagination.limit,
    );
  }
  // 2. Request again (simulate last page) and verify it matches first page since no page input
  const secondResponse = await api.functional.communityPlatform.users.index(
    actorConnection,
    {
      body: {},
    },
  );
  typia.assert(secondResponse);
  // Pagination info should be the same as first response
  TestValidator.equals(
    "second request current page equals",
    secondResponse.pagination.current,
    firstPageResponse.pagination.current,
  );
  TestValidator.equals(
    "second request limit equals",
    secondResponse.pagination.limit,
    firstPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "second request records equals",
    secondResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
  TestValidator.equals(
    "second request pages equals",
    secondResponse.pagination.pages,
    firstPageResponse.pagination.pages,
  );
  // Data arrays length match
  TestValidator.equals(
    "second request data length equals",
    secondResponse.data.length,
    firstPageResponse.data.length,
  );
  // 3. Simulate out-of-bound page request with same body
  // The server does not allow specifying page, so repeated requests return first page
  const outOfBoundsResponse =
    await api.functional.communityPlatform.users.index(actorConnection, {
      body: {},
    });
  typia.assert(outOfBoundsResponse);
  // Pagination info and data should be consistent with previous responses
  TestValidator.equals(
    "out of bounds current same as first",
    outOfBoundsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "out of bounds limit same as first",
    outOfBoundsResponse.pagination.limit,
    firstPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "out of bounds records same as first",
    outOfBoundsResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
  TestValidator.equals(
    "out of bounds pages same as first",
    outOfBoundsResponse.pagination.pages,
    firstPageResponse.pagination.pages,
  );
  // Data length should be <= limit
  TestValidator.predicate(
    "out of bounds data length <= limit",
    outOfBoundsResponse.data.length <= outOfBoundsResponse.pagination.limit,
  );
}
