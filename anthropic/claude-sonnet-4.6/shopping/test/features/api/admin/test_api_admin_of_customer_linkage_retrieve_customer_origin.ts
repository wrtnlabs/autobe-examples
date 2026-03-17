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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_of_customer_linkage_retrieve_customer_origin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account (this customer will be promoted to admin)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // Step 2: As the customer, submit an admin promotion request
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: "I want to become an admin to help manage the platform.",
        },
      },
    );
  typia.assert(adminRequest);
  // Step 3: Register a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuthorized);
  // Step 4: As the super admin, approve the pending admin request
  const reviewedRequest =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(reviewedRequest);
  // Step 5: Activate the new admin account (this creates the shopping_mall_admin_of_customers linkage)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuthorized);
  const adminId = adminAuthorized.id;
  // Step 6: Retrieve the customer-origin linkage using the admin's connection
  const ofCustomerRecord =
    await api.functional.shoppingMall.admin.admins.ofCustomer(adminConnection, {
      adminId: adminId,
    });
  typia.assert(ofCustomerRecord);
  // Step 7: Validate the returned record
  TestValidator.equals(
    "admin_id matches promoted admin UUID",
    ofCustomerRecord.admin_id,
    adminId,
  );
  TestValidator.equals(
    "customer_id matches original customer UUID",
    ofCustomerRecord.customer_id,
    customerId,
  );
  TestValidator.equals(
    "customer email matches original registration email",
    ofCustomerRecord.customer.email,
    customerEmail,
  );
  TestValidator.predicate(
    "isBanned is false for new customer",
    !ofCustomerRecord.customer.isBanned,
  );
}