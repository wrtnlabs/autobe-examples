import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_profile_retrieval_by_super_admin_customer_origin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator and get authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Register customer and get authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
    },
  });
  const customerId = customerAuth.id;
  // 3. Customer submits an administrator promotion request
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  const requestId = adminRequest.id;
  // 4. Super administrator approves the pending admin request
  const reviewResult =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(reviewResult);
  // The adminId comes from the approval response (per scenario description)
  // The review response id is interpreted as the newly created admin's id
  const adminId = reviewResult.id;
  // 5. Primary test: Super admin retrieves the admin profile
  const adminProfile = await api.functional.shoppingMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId,
    },
  );
  typia.assert(adminProfile);
  // 6. Validations
  // id matches the adminId used in request path
  TestValidator.equals("admin id matches", adminProfile.id, adminId);
  // email matches the customer's email
  TestValidator.equals(
    "admin email matches customer email",
    adminProfile.email,
    customerEmail,
  );
  // actor_type is 'customer' (promoted from customer account)
  TestValidator.equals(
    "actor_type is customer",
    adminProfile.actor_type,
    "customer",
  );
  // grade is 'regular' (default when promoted from an adminRequest)
  TestValidator.equals("grade is regular", adminProfile.grade, "regular");
  // deleted_at is null (account is active)
  TestValidator.equals(
    "admin account is active (deleted_at is null)",
    adminProfile.deleted_at,
    null,
  );
  // Validate origin is IShoppingMallAdminOfCustomer
  // The origin must be a customer-type origin
  // Check admin_id and customer_id in origin
  typia.assertGuard<IShoppingMallAdminOfCustomer>(adminProfile.origin);
  TestValidator.equals(
    "origin admin_id matches",
    adminProfile.origin.admin_id,
    adminId,
  );
  TestValidator.equals(
    "origin customer_id matches",
    adminProfile.origin.customer_id,
    customerId,
  );
  // Validate customer summary in origin has correct email
  TestValidator.equals(
    "origin customer email matches",
    adminProfile.origin.customer.email,
    customerEmail,
  );
  // Validate customer is not banned
  TestValidator.equals(
    "origin customer is not banned",
    adminProfile.origin.customer.isBanned,
    false,
  );
}
