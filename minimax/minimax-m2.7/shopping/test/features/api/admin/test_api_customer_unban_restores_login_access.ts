import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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

/**
 * Test that unbanning a banned customer account restores their ability to log in.
 *
 * Validates the complete unban workflow including administrative ban removal, customer account restoration, and login access verification. This test ensures that the ban mechanism works correctly in both directions - banning prevents login and unbanning restores it.
 *
 * The test follows a multi-step validation approach:
 * 1. Administrator registers and authenticates on the platform
 * 2. Customer registers and authenticates to establish baseline access
 * 3. Administrator bans the customer to verify ban mechanism
 * 4. Administrator unbans the customer and validates account restoration
 * 5. Customer successfully logs in with original credentials to confirm access restored
 *
 * This scenario validates that banned customers cannot access their accounts and that the unban operation properly restores all account functionality including authentication.
 */
export async function test_api_customer_unban_restores_login_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Setup - Register customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Ban the customer (as admin)
  const bannedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.ban(
      adminConnection,
      { customerId: customer.id },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer is banned",
    bannedCustomer.deletedAt !== null,
    true,
  );
  // 4. Unban the customer (as admin)
  const unbannedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.unban(
      adminConnection,
      { customerId: customer.id },
    );
  typia.assert(unbannedCustomer);
  // 5. Validate unban response
  TestValidator.equals(
    "customer id preserved",
    unbannedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email preserved",
    unbannedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer is unbanned (deletedAt is null)",
    unbannedCustomer.deletedAt,
    null,
  );
  TestValidator.predicate(
    "profile exists after unban",
    unbannedCustomer.profile !== undefined,
  );
  TestValidator.equals(
    "profile display name preserved",
    unbannedCustomer.profile.display_name,
    customer.profile.display_name,
  );
  // 6. Verify customer can log in again
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 7. Validate login response
  TestValidator.equals(
    "login returns correct customer id",
    loginResult.id,
    customer.id,
  );
  TestValidator.equals(
    "login returns correct email",
    loginResult.email,
    customerEmail,
  );
  TestValidator.equals(
    "login returns active status",
    loginResult.deletedAt,
    null,
  );
}
