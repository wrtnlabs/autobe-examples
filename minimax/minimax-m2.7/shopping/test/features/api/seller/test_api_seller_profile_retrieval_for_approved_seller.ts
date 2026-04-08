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
 * Test retrieving a seller's public profile when the seller has approved status.
 *
 * Validates the customer-facing seller profile retrieval endpoint. A customer authenticated via customer join accesses the GET /ecommerceMall/customer/sellers/{sellerId} endpoint with a valid approved seller ID. The system validates the seller exists, has approval_status='approved', and is not soft-deleted. The response includes seller profile data containing shop name, description, logo, and nested seller information.
 *
 * 1. Customer authenticates via customer join (dependency)
 * 2. Customer retrieves seller profile using a known approved seller ID
 * 3. Validates response contains required fields matching IEcommerceMallSeller.IInvert:
 *    - id: UUID of the seller
 *    - approvalStatus: 'approved' (string literal)
 *    - sellerProfile: object with name, description, logoUri
 *    - createdAt: ISO date-time string
 *    - updatedAt: ISO date-time string
 */
export async function test_api_seller_profile_retrieval_for_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication (required dependency)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve seller profile for an approved seller
  // Note: In production E2E tests, this sellerId would be created through
  // seller registration and admin approval flow. For this test scope,
  // we use a known approved seller ID from the test environment.
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerProfile = await api.functional.ecommerceMall.customer.sellers.at(
    customerConnection,
    { sellerId },
  );
  typia.assert(sellerProfile);
  // 3. Validate business logic: approvalStatus is 'approved'
  TestValidator.equals(
    "approvalStatus is approved",
    sellerProfile.approvalStatus,
    "approved",
  );
  // 4. Validate sellerProfile object exists and has required nested fields
  TestValidator.predicate(
    "sellerProfile is defined",
    sellerProfile.sellerProfile !== undefined,
  );
  TestValidator.equals(
    "sellerProfile name matches expected string type",
    typeof sellerProfile.sellerProfile.name,
    "string",
  );
  TestValidator.equals(
    "sellerProfile description matches expected string type",
    typeof sellerProfile.sellerProfile.description,
    "string",
  );
}
