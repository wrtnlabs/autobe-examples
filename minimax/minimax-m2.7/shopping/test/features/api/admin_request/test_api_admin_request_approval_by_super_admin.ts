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

export async function test_api_admin_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create and authenticate as a customer who will submit the admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Customer submits an admin request with a reason
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin.requests.create(
      customerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure quality service.",
          requested_grade: "admin",
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Verify initial state - request is pending
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
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
  TestValidator.equals("no reviewer yet", adminRequest.reviewer, null);
  // 4. Super admin approves the admin request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate the approval response
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer ID matches super admin",
    approvedRequest.reviewer?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "requested_grade preserved",
    approvedRequest.requested_grade,
    "admin",
  );
  TestValidator.equals(
    "actor_type preserved",
    approvedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason preserved",
    approvedRequest.reason,
    "I want to help manage the platform and ensure quality service.",
  );
}
