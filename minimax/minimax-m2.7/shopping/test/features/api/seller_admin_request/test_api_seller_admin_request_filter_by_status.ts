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

export async function test_api_seller_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit an admin privilege request (creates pending request)
  const adminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  // 3. List requests filtered by status='pending'
  const pendingResult =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "contains pending request",
    pendingResult.data.some((r) => r.id === adminRequest.id),
  );
  // 4. List requests filtered by status='approved'
  const approvedResult =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "no approved requests yet",
    approvedResult.data.length === 0,
  );
  // 5. List requests filtered by status='rejected'
  const rejectedResult =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "no rejected requests yet",
    rejectedResult.data.length === 0,
  );
  // 6. List requests with invalid status value (business logic validation)
  await TestValidator.error("invalid status value", async () => {
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "invalid_status" as any,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  });
}
