import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_registration_email_same_as_seller(
  connection: api.IConnection,
): Promise<void> {
  // Shared email for both customer and seller accounts
  const sharedEmail = "shared@example.com";
  // Step 1: Register seller account with shared@example.com
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sharedEmail,
        password: "SellerPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // Verify seller registration response
  TestValidator.equals("seller email matches", sellerAuth.email, sharedEmail);
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller has valid token",
    sellerAuth.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "seller has valid refresh token",
    sellerAuth.token.refresh.length > 0,
    true,
  );
  // Step 2: Register customer account with the same email (shared@example.com)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: sharedEmail,
        password: "CustomerPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAuth);
  // Verify customer registration response
  TestValidator.equals(
    "customer email matches",
    customerAuth.email,
    sharedEmail,
  );
  TestValidator.equals(
    "customer has valid token",
    customerAuth.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "customer has valid refresh token",
    customerAuth.token.refresh.length > 0,
    true,
  );
  // Step 3: Verify seller and customer have different IDs (different actor tables)
  TestValidator.notEquals(
    "seller and customer have different IDs",
    sellerAuth.id,
    customerAuth.id,
  );
  // Step 4: Verify seller can login with shared email and their password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await api.functional.ecommerceMall.auth.seller.login(
    sellerLoginConnection,
    {
      body: {
        email: sharedEmail,
        password: "SellerPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginAuth);
  // Verify seller login returns correct data
  TestValidator.equals(
    "seller login email matches",
    sellerLoginAuth.email,
    sharedEmail,
  );
  TestValidator.equals(
    "seller login ID matches original",
    sellerLoginAuth.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller login approval status is pending",
    sellerLoginAuth.approval_status,
    "pending",
  );
  // Step 5: Verify customer can login with shared email and their password
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuth =
    await api.functional.ecommerceMall.auth.customer.login(
      customerLoginConnection,
      {
        body: {
          email: sharedEmail,
          password: "CustomerPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.ILogin,
      },
    );
  typia.assert(customerLoginAuth);
  // Verify customer login returns correct data
  TestValidator.equals(
    "customer login email matches",
    customerLoginAuth.email,
    sharedEmail,
  );
  TestValidator.equals(
    "customer login ID matches original",
    customerLoginAuth.id,
    customerAuth.id,
  );
  // Step 6: Verify customer cannot login with seller's password
  await TestValidator.error(
    "customer cannot login with seller password",
    async () => {
      const invalidLoginConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.customer.login(
        invalidLoginConnection,
        {
          body: {
            email: sharedEmail,
            password: "SellerPass123!", // Wrong password
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceMallCustomer.ILogin,
        },
      );
    },
  );
  // Step 7: Verify seller cannot login with customer's password
  await TestValidator.error(
    "seller cannot login with customer password",
    async () => {
      const invalidLoginConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.login(
        invalidLoginConnection,
        {
          body: {
            email: sharedEmail,
            password: "CustomerPass123!", // Wrong password
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceMallSeller.ILogin,
        },
      );
    },
  );
}
