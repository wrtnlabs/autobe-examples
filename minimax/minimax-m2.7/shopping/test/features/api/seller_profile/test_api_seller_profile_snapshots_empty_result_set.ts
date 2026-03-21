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

export async function test_api_seller_profile_snapshots_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Call PATCH /ecommerceMall/seller/seller-profile-snapshots without any filter parameters
  //    (no snapshots should exist since we haven't updated the shop profile)
  const response =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {},
      },
    );
  // 3. Validate response schema using typia.assert
  typia.assert(response);
  // 4. Verify pagination shows total records = 0 and pages = 0
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  // 5. Verify data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // 6. Verify response structure matches IPageIEcommerceMallSellerProfileSnapshot.ISummary
  TestValidator.predicate(
    "response should have pagination property",
    "pagination" in response,
  );
  TestValidator.predicate(
    "response should have data property",
    "data" in response,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
}
