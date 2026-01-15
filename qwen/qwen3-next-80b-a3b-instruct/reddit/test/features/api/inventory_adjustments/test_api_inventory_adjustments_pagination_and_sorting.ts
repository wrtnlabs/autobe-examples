import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryAdjustments";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_adjustments_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Test pagination with page=2 and limit=10
  const page2Response =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is at least 10",
    page2Response.pagination.records >= 10,
  );
  TestValidator.predicate(
    "pagination pages is at least 3",
    page2Response.pagination.pages >= 3,
  );
  // Verify data structure
  TestValidator.predicate(
    "page 2 has records array",
    Array.isArray(page2Response.data),
  );
  TestValidator.predicate(
    "page 2 has at least 1 record",
    page2Response.data.length >= 0,
  );
  if (page2Response.data.length > 0) {
    typia.assert<ICommunityPlatformInventoryAdjustments.ISummary>(
      page2Response.data[0],
    );
  }
  // Test sorting by adjustment_amount in ascending order
  const ascendingResponse =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          sort_by: "adjustment_amount",
          order: "asc",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // Verify data structure
  TestValidator.predicate(
    "ascending response has records array",
    Array.isArray(ascendingResponse.data),
  );
  if (ascendingResponse.data.length > 1) {
    // Validate sort order on at least two records
    let isSorted = true;
    for (let i = 1; i < ascendingResponse.data.length; i++) {
      if (
        ascendingResponse.data[i - 1].adjustment_amount >
        ascendingResponse.data[i].adjustment_amount
      ) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "data is sorted by adjustment_amount ascending",
      isSorted,
    );
  }
  // Test combined pagination and sorting
  const sortedPage2 =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort_by: "adjustment_amount",
          order: "asc",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(sortedPage2);
  // Verify pagination structure
  TestValidator.equals(
    "sorted page 2 current page is 2",
    sortedPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "sorted page 2 limit is 10",
    sortedPage2.pagination.limit,
    10,
  );
  // Verify data structure
  TestValidator.predicate(
    "sorted page 2 has records array",
    Array.isArray(sortedPage2.data),
  );
  if (sortedPage2.data.length > 1) {
    // Validate sort order on at least two records
    let isSortedInPage2 = true;
    for (let i = 1; i < sortedPage2.data.length; i++) {
      if (
        sortedPage2.data[i - 1].adjustment_amount >
        sortedPage2.data[i].adjustment_amount
      ) {
        isSortedInPage2 = false;
        break;
      }
    }
    TestValidator.predicate(
      "sorted page 2 data is sorted by adjustment_amount ascending",
      isSortedInPage2,
    );
  }
}
