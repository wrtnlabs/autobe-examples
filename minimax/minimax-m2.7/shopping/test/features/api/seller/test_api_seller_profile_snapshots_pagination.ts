import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Request snapshots with pagination page=1, limit=10
  const firstPage =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate pagination metadata for first page
  TestValidator.equals(
    "current page is 1",
    firstPage.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10",
    firstPage.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records >= 0",
    firstPage.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    firstPage.pagination.pagination.pages >= 0,
  );
  // 4. Validate pages calculation is correct
  const expectedPages = Math.ceil(
    firstPage.pagination.pagination.records /
      firstPage.pagination.pagination.limit,
  );
  TestValidator.equals(
    "pages computed correctly",
    firstPage.pagination.pagination.pages,
    expectedPages,
  );
  // 5. Test page=2 pagination boundary handling
  const secondPage =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  // 6. Validate second page pagination metadata
  TestValidator.equals(
    "current page is 2",
    secondPage.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit is still 10",
    secondPage.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records consistent",
    secondPage.pagination.pagination.records ===
      firstPage.pagination.pagination.records,
  );
  TestValidator.predicate("data is array", Array.isArray(secondPage.data));
}
