import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_seller_admin_request_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = sellerConnection.headers ?? {};
  sellerConnection.headers.Authorization = authorized.token.access;
  // 2. Submit an admin request
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const adminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: reason,
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. List all admin requests with empty body (no filters)
  const listResponse =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(listResponse);
  // 4. Validate the created request is in the list
  const foundRequest = listResponse.data.find(
    (item) => item.id === adminRequest.id,
  );
  TestValidator.equals("created request found in list", !!foundRequest, true);
  // 5. Validate request fields match
  TestValidator.equals("status is pending", foundRequest!.status, "pending");
  TestValidator.equals("reason matches", foundRequest!.reason, reason);
  TestValidator.equals(
    "rejection_reason is null",
    foundRequest!.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewedBySuperAdmin is null",
    foundRequest!.reviewedBySuperAdmin,
    null,
  );
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", listResponse.pagination.current, 1);
  TestValidator.predicate("records >= 1", listResponse.pagination.records >= 1);
  // 7. Validate ordering - newest first (descending by created_at)
  for (let i = 1; i < listResponse.data.length; i++) {
    const prev = new Date(listResponse.data[i - 1].created_at);
    const curr = new Date(listResponse.data[i].created_at);
    TestValidator.predicate("sorted by created_at descending", prev >= curr);
  }
}
