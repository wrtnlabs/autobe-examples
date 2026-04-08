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

export async function test_api_admin_request_retrieve_pending_seller_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      password: superAdminPassword,
    },
  });
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  // 3. Submit an admin request from the seller account
  const adminRequestReason = RandomGenerator.paragraph({ sentences: 2 });
  const adminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: adminRequestReason,
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Authenticate as super admin (fresh session for retrieval)
  const superAdminRetrievalConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_login(superAdminRetrievalConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 5. Retrieve the pending admin request
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.at(
      superAdminRetrievalConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response fields
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actorType is seller",
    retrievedRequest.actorType,
    "seller",
  );
  TestValidator.predicate(
    "requestedGrade is valid",
    retrievedRequest.requestedGrade === "admin" ||
      retrievedRequest.requestedGrade === "super_admin",
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequestReason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  TestValidator.equals(
    "reviewedReason is null",
    retrievedRequest.reviewedReason,
    null,
  );
  TestValidator.predicate(
    "createdAt exists",
    retrievedRequest.createdAt !== undefined &&
      retrievedRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt exists",
    retrievedRequest.updatedAt !== undefined &&
      retrievedRequest.updatedAt !== null,
  );
  TestValidator.equals("deletedAt is null", retrievedRequest.deletedAt, null);
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller?.email,
    seller.email,
  );
}
