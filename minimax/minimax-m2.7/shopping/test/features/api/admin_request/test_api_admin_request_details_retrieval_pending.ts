import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_details_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account to submit the admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Customer submits an admin request with a reason
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure quality service.",
          requested_grade: "admin",
        },
      },
    );
  typia.assert(adminRequest);
  // Validate the request was created with pending status
  TestValidator.equals(
    "actor_type is customer",
    adminRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "requested_grade is admin",
    adminRequest.requested_grade,
    "admin",
  );
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  // 3. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  // Create super admin account
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Authenticate with created credentials
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Super admin retrieves the admin request details
  const requestDetails =
    await api.functional.ecommerceMall.superAdmin.admin.requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(requestDetails);
  // 5. Validate all expected fields are present and correct
  TestValidator.equals(
    "request ID matches",
    requestDetails.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actor_type is customer",
    requestDetails.actor_type,
    "customer",
  );
  TestValidator.equals(
    "requested_grade is admin",
    requestDetails.requested_grade,
    "admin",
  );
  TestValidator.equals("status is pending", requestDetails.status, "pending");
  TestValidator.predicate(
    "reason is non-empty string",
    requestDetails.reason.length > 0,
  );
  TestValidator.predicate(
    "has valid created_at",
    requestDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    requestDetails.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", requestDetails.deleted_at, null);
  TestValidator.equals(
    "reviewer is null for pending request",
    requestDetails.reviewer,
    null,
  );
}
