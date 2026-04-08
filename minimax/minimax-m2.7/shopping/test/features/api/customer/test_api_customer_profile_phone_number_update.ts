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

/**
 * Test updating only the phone number while keeping the display name unchanged.
 *
 * Validates that a customer can update their phone number for order notifications
 * while preserving their display name. The phone number is essential for delivery
 * coordination with shipping carriers. This test ensures partial profile updates
 * work correctly by submitting both fields (display_name and phone) but only
 * changing the phone value.
 *
 * 1. Customer registers with initial profile including display name and phone.
 * 2. Store the original display name for later verification.
 * 3. Submit PATCH request with original display name and new phone number.
 * 4. Verify phone number is updated to the new value.
 * 5. Confirm display_name remains unchanged.
 * 6. Validate updated_at timestamp reflects the change.
 */
export async function test_api_customer_profile_phone_number_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Store the original display name for later verification
  const originalDisplayName = authorized.profile.display_name;
  const originalPhone = authorized.profile.phone;
  // 3. Generate a new phone number for the update
  const newPhone = RandomGenerator.mobile();
  // 4. Submit PATCH request with original display name and new phone number
  const updatedProfile =
    await api.functional.ecommerceMall.customer.customers.me.update(
      customerConnection,
      {
        body: {
          display_name: originalDisplayName,
          phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify phone number is updated to the new value
  TestValidator.equals("phone number updated", updatedProfile.phone, newPhone);
  // 6. Confirm display_name remains unchanged
  TestValidator.equals(
    "display name unchanged",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 7. Verify the phone number actually changed
  TestValidator.notEquals(
    "phone actually changed",
    updatedProfile.phone,
    originalPhone,
  );
  // 8. Validate updated_at timestamp is present and valid
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    (() => {
      const date = new Date(updatedProfile.updated_at);
      return !isNaN(date.getTime());
    })(),
  );
  // 9. Verify updated_at is after or equal to created_at
  TestValidator.predicate(
    "updated_at after created_at",
    (() => {
      const created = new Date(updatedProfile.created_at);
      const updated = new Date(updatedProfile.updated_at);
      return updated >= created;
    })(),
  );
}
