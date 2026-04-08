import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as seller to get authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Test with limit=1 and navigate through pages
  const page1Response =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 1);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  // Check if we need to calculate expected total pages
  const totalRecords = page1Response.pagination.records;
  const totalPages = Math.ceil(totalRecords / 1);
  TestValidator.equals(
    "page 1 total pages calculation",
    page1Response.pagination.pages,
    totalPages,
  );
  // If there's more than one record, check page 2
  if (totalRecords > 1) {
    const page2Response =
      await api.functional.ecommerceMall.seller.profile_snapshots.index(
        sellerConnection,
        {
          body: {
            createdAfter: null,
            createdBefore: null,
            page: 2,
            limit: 1,
          } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Response.pagination.limit, 1);
    TestValidator.predicate(
      "page 2 data length <= limit",
      page2Response.data.length <= page2Response.pagination.limit,
    );
    // Verify page 2 has different data than page 1 (if total > 1)
    if (page1Response.data.length > 0 && page2Response.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different data",
        page1Response.data[0]!.id,
        page2Response.data[0]!.id,
      );
    }
  }
  // 3. Test with limit=100 (maximum allowed)
  const maxLimitResponse =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit current page",
    maxLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit value",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data length <= limit",
    maxLimitResponse.data.length <= maxLimitResponse.pagination.limit,
  );
  TestValidator.equals(
    "max limit records match expected",
    maxLimitResponse.pagination.records,
    totalRecords,
  );
  // 4. Test page beyond available data
  const beyondPage = totalPages + 10; // Go well beyond available pages
  const beyondResponse =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          page: beyondPage,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(beyondResponse);
  TestValidator.equals(
    "beyond page current page",
    beyondResponse.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page limit",
    beyondResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page data should be empty",
    beyondResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page records should match total",
    beyondResponse.pagination.records,
    totalRecords,
  );
}
