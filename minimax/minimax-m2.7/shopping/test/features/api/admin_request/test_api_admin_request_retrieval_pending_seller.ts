import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_admin_request_retrieval_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller who will submit the admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create admin request as the seller
  const adminRequest =
    await generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Register a super admin who will retrieve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 4. Retrieve the admin request as super admin
  const retrieved =
    await api.functional.ecommerceMall.superAdmin.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response structure and content
  TestValidator.equals("id matches", retrieved.id, adminRequest.id);
  TestValidator.equals("actorType is seller", retrieved.actorType, "seller");
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "reviewedReason is null",
    retrieved.reviewedReason,
    null,
  );
  TestValidator.predicate(
    "seller is included",
    retrieved.seller !== undefined && retrieved.seller !== null,
  );
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals(
    "createdAt exists",
    retrieved.createdAt !== undefined && retrieved.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "updatedAt exists",
    retrieved.updatedAt !== undefined && retrieved.updatedAt !== null,
    true,
  );
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
}
