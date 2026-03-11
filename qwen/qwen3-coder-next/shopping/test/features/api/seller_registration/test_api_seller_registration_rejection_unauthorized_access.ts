import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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

/**
 * Test unauthorized seller registration rejection attempt by a regular customer.
 * Steps: 1) Create seller registration (pending status), 2) Authenticate as customer,
 * 3) Attempt rejection with customer credentials (should fail with unauthorized),
 * 4) Verify rejection fails with 403 forbidden status.
 */
export async function test_api_seller_registration_rejection_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a pending seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a customer (non-admin) to attempt rejection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoin,
  });
  typia.assert(customerAuthorized);
  // 3. Attempt seller registration rejection with unauthorized customer
  // Should fail with 403 forbidden when non-admin tries to reject registration
  await TestValidator.httpError(
    "unauthorized rejection attempt",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.seller_registrations.reject(
        customerConnection,
        {
          sellerRegistrationCode: sellerAuthorized.id,
          body: {
            approval_status: "rejected",
            rejection_reason: "Test rejection by unauthorized user",
            responded_at: new Date().toISOString(),
          } satisfies IEcommerceMallSellerRegistration.IUpdate,
        },
      );
    },
  );
}
