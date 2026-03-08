import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_listing_admin_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call seller listing with empty request body (default pagination)
  const sellerListing = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(sellerListing);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    sellerListing.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    sellerListing.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records is non-negative",
    () => sellerListing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => sellerListing.pagination.pages >= 0,
  );
  // Verify pagination relationship: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    sellerListing.pagination.records / sellerListing.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    sellerListing.pagination.pages,
    expectedPages,
  );
  // 4. Verify data array length matches pagination
  TestValidator.equals(
    "data array length matches limit or remaining records",
    sellerListing.data.length,
    sellerListing.pagination.records <= sellerListing.pagination.limit
      ? sellerListing.pagination.records
      : sellerListing.pagination.limit,
  );
  // 5. Verify ordering by created_at descending (newest first)
  if (sellerListing.data.length > 1) {
    for (let i = 0; i < sellerListing.data.length - 1; i++) {
      const current = new Date(sellerListing.data[i].created_at).getTime();
      const next = new Date(sellerListing.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `seller ${i} created_at >= seller ${i + 1} created_at`,
        () => current >= next,
      );
    }
  }
  // 6. Verify data array contains seller summaries (typia.assert on each item)
  for (const seller of sellerListing.data) {
    typia.assert(seller);
  }
}