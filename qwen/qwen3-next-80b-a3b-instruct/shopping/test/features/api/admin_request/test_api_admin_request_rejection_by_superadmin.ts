import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import type { IShoppingMallAdminRequestRejectResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestRejectResponse";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { prepare_random_shopping_mall_admin_password_reset } from "../../../prepare/prepare_random_shopping_mall_admin_password_reset";
import { generate_random_shopping_mall_customer_admins_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admins_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_request_rejection_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super administrator account using the join operation
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create a customer account and authenticate as the customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 3: Submit an administrator request as the customer
  const adminRequest =
    await generate_random_shopping_mall_customer_admins_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IShoppingMallAdminPasswordReset.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Step 4: Switch to super administrator connection and reject the request
  const response =
    await api.functional.shoppingMall.superAdmin.admins.requests.reject(
      superAdminConnection,
      {
        adminRequestId: adminRequest.adminRequestId,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IShoppingMallCancellationRequest,
      },
    );
  // Verify the rejection was successful
  typia.assert<IShoppingMallAdminRequestRejectResponse>(response);
  // Verify the admin request status is now 'rejected'
  // We can validate this by checking the admin request after rejection
  const updatedRequest =
    await api.functional.shoppingMall.customer.admins.requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IShoppingMallAdminPasswordReset.ICreate,
      },
    );
  // Since we don't have a GET endpoint, we check behavior: after rejection, re-applying should be blocked
  // But in our API, we only have POST for creating requests, not for reading
  // Therefore we need to test that rejection prevents re-application
  // Attempt to reapply as the same customer - expecting 403 (Forbidden)
  await TestValidator.error(
    "Re-application should be blocked after rejection",
    async () => {
      await api.functional.shoppingMall.customer.admins.requests.create(
        customerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 15,
            }),
          } satisfies IShoppingMallAdminPasswordReset.ICreate,
        },
      );
    },
  );
}
