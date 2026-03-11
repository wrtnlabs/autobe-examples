import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_seller_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secureAdmin123!",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secureSeller123!",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Submit admin request as seller
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "Requesting administrative access for platform management and shop operations",
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Retrieve seller admin request details as super administrator
  const sellerRequestDetails =
    await api.functional.ecommerceMall.admin.admin_requests.seller_request.at(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(sellerRequestDetails);
  // 5. Validate response fields
  TestValidator.equals(
    "request ID matches",
    sellerRequestDetails.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "request reason preserved",
    sellerRequestDetails.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "request status is pending",
    sellerRequestDetails.request_status,
    "pending",
  );
  TestValidator.equals(
    "seller email matches original",
    sellerRequestDetails.seller.email,
    sellerJoinResult.email,
  );
  TestValidator.equals(
    "seller approval status is pending",
    sellerRequestDetails.seller.approvalStatus,
    "pending",
  );
  TestValidator.predicate(
    "seller shop name exists",
    sellerRequestDetails.sellerProfile.shopName !== "",
  );
  TestValidator.equals(
    "request created_at exists",
    sellerRequestDetails.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "request updated_at exists",
    sellerRequestDetails.updated_at !== undefined,
    true,
  );
  TestValidator.predicate(
    "admin actor exists in request",
    sellerRequestDetails.admin !== null,
  );
}
