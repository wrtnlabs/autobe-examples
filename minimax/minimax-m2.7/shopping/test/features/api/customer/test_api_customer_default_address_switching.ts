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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test switching the default shipping address when creating a new address with is_default=true.
 *
 * Validates the default address switching behavior when a customer creates a new shipping
 * address marked as default. The system should automatically unset the previous default address
 * when a new one is designated as default. This ensures only one address can be the default
 * at any given time.
 *
 * 1. Authenticate as a customer.
 * 2. Create first address with is_default=true.
 * 3. Verify first address is default.
 * 4. Create second address with is_default=true.
 * 5. Verify second address is default.
 * 6. Create third address with is_default=false.
 * 7. Verify third address is not default.
 * 8. Verify first address is still not default (was unmarked when second became default).
 * 9. Verify second address is still the only default.
 */
export async function test_api_customer_default_address_switching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address with is_default=true
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Verify first address is created with is_default=true
  TestValidator.equals(
    "first address is default",
    firstAddress.isDefault,
    true,
  );
  // 4. Create second address also with is_default=true
  const secondAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(secondAddress);
  // 5. Verify second address is created with is_default=true
  TestValidator.equals(
    "second address is default",
    secondAddress.isDefault,
    true,
  );
  // 6. Create third address with is_default=false to verify first address was unmarked
  const thirdAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(thirdAddress);
  // 7. Verify third address is not default
  TestValidator.equals(
    "third address is not default",
    thirdAddress.isDefault,
    false,
  );
  // 8. Verify addresses have different IDs
  TestValidator.notEquals(
    "first and second have different IDs",
    firstAddress.id,
    secondAddress.id,
  );
  TestValidator.notEquals(
    "second and third have different IDs",
    secondAddress.id,
    thirdAddress.id,
  );
  TestValidator.notEquals(
    "first and third have different IDs",
    firstAddress.id,
    thirdAddress.id,
  );
  // 9. Verify the default switching behavior:
  // - Only second address (most recent default) should be default
  // - First address should no longer be default (was automatically unmarked)
  // - Third address should not be default (explicitly set to false)
  TestValidator.equals(
    "first address is no longer default after second became default",
    firstAddress.isDefault,
    false,
  );
  TestValidator.equals(
    "second address remains the only default",
    secondAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "third address is not default",
    thirdAddress.isDefault,
    false,
  );
}
