import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_admin_seller_profile_snapshots_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Submit seller registration to ensure proper seller setup
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {},
  );
  // 4. Query profile snapshots with pagination - first page
  const page1 =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Test edge case - request page beyond available data
  const emptyPage =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 999,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page returns no data", emptyPage.data.length, 0);
  // 6. Test with different limit parameter
  const smallLimit =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 1,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals(
    "small limit is respected",
    smallLimit.pagination.limit,
    1,
  );
  // 7. If snapshots exist, validate business logic
  if (page1.data.length > 0) {
    const snapshot = page1.data[0];
    TestValidator.equals(
      "snapshot sellerId matches query",
      snapshot.sellerId,
      seller.id,
    );
    TestValidator.equals(
      "snapshot seller summary id matches",
      snapshot.seller.id,
      seller.id,
    );
  }
  // 8. Verify pagination metadata consistency
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation is correct",
      page1.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "zero records means zero pages",
      page1.pagination.pages,
      0,
    );
  }
}
