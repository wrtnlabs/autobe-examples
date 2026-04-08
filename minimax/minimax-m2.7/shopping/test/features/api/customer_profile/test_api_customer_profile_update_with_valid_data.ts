import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
/**
 * Test updating the authenticated customer's profile with valid display name and phone number.
 *
 * Validates the complete profile update flow for an authenticated customer. Ensures that:
 * - The customer can successfully update their display name (max 100 characters)
 * - The customer can successfully update their phone number (10-20 characters)
 * - The response returns the complete updated profile with all fields
 * - The updated_at timestamp is refreshed to the current time
 * - The nested customer object correctly reflects the customer's email
 *
 * This test verifies the primary success path for customer profile management, confirming that valid updates are accepted and properly reflected in the response.
 *
 * 1. Authenticate as a customer via join endpoint.
 * 2. Submit PATCH request with new display_name and phone number.
 * 3. Validate response contains complete updated profile including id, display_name, phone, created_at, updated_at.
 * 4. Confirm updated_at timestamp is recent (within seconds of current time).
 * 5. Verify nested customer object contains correct email.
 */
export async function test_api_customer_profile_update_with_valid_data(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as a customer via join endpoint
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {});
    typia.assert(authorized);
    const originalEmail = authorized.email;
    // 2. Generate random display name and phone number for update
    const newDisplayName = RandomGenerator.paragraph({ sentences: 1 });
    const newPhone = RandomGenerator.mobile();
    // 3. Submit PATCH request with new display_name and phone
    const updatedProfile = await api.functional.ecommerceMall.customer.customers.me.update(customerConnection, {
        body: {
            display_name: newDisplayName,
            phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
    });
    typia.assert(updatedProfile);
    // 4. Validate response returns complete updated profile
    TestValidator.equals("display name matches input", updatedProfile.display_name, newDisplayName);
    TestValidator.equals("phone matches input", updatedProfile.phone, newPhone);
    TestValidator.predicate("has valid id", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedProfile.id));
    TestValidator.predicate("has valid created_at", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.created_at));
    TestValidator.predicate("has valid updated_at", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.updated_at));
    // 5. Confirm updated_at timestamp is recent (within seconds)
    const now = new Date();
    const updatedAtDate = new Date(updatedProfile.updated_at);
    const timeDiffMs = Math.abs(now.getTime() - updatedAtDate.getTime());
    TestValidator.predicate("updated_at is recent", timeDiffMs < 5000);
    // 6. Verify nested customer object contains correct email
    TestValidator.equals("customer email matches", updatedProfile.customer.email, originalEmail);
}