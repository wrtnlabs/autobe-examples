import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_seller_admin_request_retrieve_rejected_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin registers
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller submits admin privilege request
  const adminRequest =
    await generate_random_ecommerce_mall_seller_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  const rejectionReason =
    "Insufficient experience for admin privileges. Please apply again after gaining more platform experience.";
  // 4. SuperAdmin rejects the request
  await api.functional.ecommerceMall.superAdmin.admin.requests.update(
    superAdminConnection,
    {
      requestId: adminRequest.id,
      body: {
        status: "rejected",
        reviewed_reason: rejectionReason,
      } satisfies IEcommerceMallAdminRequest.IUpdate,
    },
  );
  // 5. SuperAdmin retrieves the rejected request
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason is populated",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedBySuperAdmin is populated",
    retrievedRequest.reviewedBySuperAdmin !== null,
  );
  if (retrievedRequest.reviewedBySuperAdmin) {
    TestValidator.equals(
      "reviewer id matches superAdmin",
      retrievedRequest.reviewedBySuperAdmin.id,
      superAdmin.id,
    );
  }
  TestValidator.equals(
    "seller id matches original",
    retrievedRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email preserved",
    retrievedRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "created_at preserved",
    retrievedRequest.created_at,
    adminRequest.created_at,
  );
  TestValidator.predicate(
    "updated_at reflects rejection",
    retrievedRequest.updated_at >= retrievedRequest.created_at,
  );
}
