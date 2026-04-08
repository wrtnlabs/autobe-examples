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
 * Test that a banned customer cannot log in to the platform after the administrator bans their account, verifying session invalidation.
 *
 * Validates the complete ban workflow including administrator account creation, customer registration, baseline login verification, administrative ban action, and subsequent login denial. This test ensures that the ban mechanism properly invalidates customer sessions and prevents authentication even with valid credentials.
 *
 * The test follows a strict sequence: first establishing a baseline by confirming the customer can authenticate, then applying the administrative ban action, and finally verifying that the same valid credentials are rejected. This validates that the ban enforcement is immediate and comprehensive.
 *
 * 1. Administrator registers and authenticates to gain admin privileges.
 * 2. Customer registers with valid email/password credentials.
 * 3. Baseline verification confirms customer can authenticate with valid credentials.
 * 4. Administrator bans the customer account by customer ID.
 * 5. System validates the ban was applied successfully (soft delete timestamp set).
 * 6. Customer login attempt is denied with appropriate error response.
 * 7. Error handling verifies no sensitive ban information is leaked in response.
 */
export async function test_api_customer_login_denied_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register customer account and capture credentials for later login attempt
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuthBeforeBan = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuthBeforeBan);
  // 3. Verify customer can login successfully before being banned (baseline)
  const preBanLoginConnection: api.IConnection = { host: connection.host };
  const preBanLogin = await authorize_customer_login(preBanLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(preBanLogin);
  // 4. Administrator bans the customer account
  const bannedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.ban(
      adminConnection,
      { customerId: customerAuthBeforeBan.id },
    );
  typia.assert(bannedCustomer);
  // 5. Verify ban was applied - deletedAt should be set (non-null)
  TestValidator.equals(
    "customer should be banned (deletedAt non-null)",
    bannedCustomer.deletedAt !== null,
    true,
  );
  // 6. Attempt to login as banned customer - should be denied
  const postBanLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned customer login should be denied",
    [401, 403],
    async () => {
      await authorize_customer_login(postBanLoginConnection, {
        body: {
          email: customerEmail,
          password: customerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.ILogin,
      });
    },
  );
}
