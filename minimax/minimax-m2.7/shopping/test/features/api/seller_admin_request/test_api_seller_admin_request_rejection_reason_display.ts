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

export async function test_api_seller_admin_request_rejection_reason_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Submit an admin privilege request
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
  // 3. Retrieve the list of admin requests
  const requestList =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(requestList);
  // 4. Verify pending request does NOT have rejection_reason populated
  TestValidator.predicate(
    "pending request should have no rejection_reason or null",
    requestList.data.some(
      (r) =>
        r.id === adminRequest.id &&
        (r.rejection_reason === null || r.rejection_reason === undefined),
    ),
  );
  // 5. Retrieve all requests to verify structure
  const allRequests =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 6. Verify the pending request from this seller exists in the list
  const myRequest = allRequests.data.find((r) => r.id === adminRequest.id);
  TestValidator.equals(
    "request should be found in list",
    myRequest !== undefined,
    true,
  );
  if (myRequest) {
    // 7. Verify rejection_reason field exists but is null for pending status
    TestValidator.equals("pending request status", myRequest.status, "pending");
    TestValidator.equals(
      "rejection_reason should be null for pending request",
      myRequest.rejection_reason === null ||
        myRequest.rejection_reason === undefined,
      true,
    );
    // 8. Verify seller information is included
    TestValidator.equals(
      "seller email matches",
      myRequest.seller.email,
      sellerAuth.email,
    );
  }
}
