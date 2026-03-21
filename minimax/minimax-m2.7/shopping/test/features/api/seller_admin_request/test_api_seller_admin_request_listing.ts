import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_seller_admin_request_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
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
  // 2. Submit an admin privilege request with a reason
  const adminRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          requested_grade: "admin",
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Call the list endpoint to retrieve admin requests
  const response =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 4. Validate response includes paginated results
  TestValidator.equals("has pagination", response.pagination !== null, true);
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(response.data) && response.data.length > 0,
  );
  // 5. Validate request summary contains required fields
  const listedRequest = response.data[0];
  TestValidator.equals("has id", listedRequest.id !== undefined, true);
  TestValidator.equals("has status", listedRequest.status !== undefined, true);
  TestValidator.equals("has reason", listedRequest.reason !== undefined, true);
  TestValidator.equals(
    "has created_at",
    listedRequest.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "has seller info",
    listedRequest.seller !== undefined,
    true,
  );
  // 6. Verify the created request is in the list
  const foundRequest = response.data.find((r) => r.id === adminRequest.id);
  TestValidator.notEquals(
    "created request appears in list",
    foundRequest,
    undefined,
  );
  TestValidator.equals("status is pending", foundRequest!.status, "pending");
  // 7. Verify results are ordered by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const previous = new Date(response.data[i - 1].created_at).getTime();
    TestValidator.predicate(
      `item ${i} is older or equal to item ${i - 1}`,
      current <= previous,
    );
  }
}
