import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a customer to retrieve details for
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Admin retrieves customer details by customerId
  const retrievedCustomer =
    await api.functional.ecommerceMall.admin.customers.at(adminConnection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);
  // 4. Validate response contains complete customer data
  TestValidator.equals(
    "customer id matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "created_at exists",
    retrievedCustomer.created_at !== null &&
      retrievedCustomer.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    retrievedCustomer.updated_at !== null &&
      retrievedCustomer.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active customer",
    retrievedCustomer.deleted_at,
    null,
  );
  // 5. Validate nested profile data
  TestValidator.equals(
    "profile display_name exists",
    retrievedCustomer.profile.display_name !== null &&
      retrievedCustomer.profile.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "profile phone exists",
    retrievedCustomer.profile.phone !== null &&
      retrievedCustomer.profile.phone !== undefined,
    true,
  );
  // 6. Validate related data arrays are present
  TestValidator.equals(
    "shippingAddresses is array",
    Array.isArray(retrievedCustomer.shippingAddresses),
    true,
  );
  TestValidator.equals(
    "orders is array",
    Array.isArray(retrievedCustomer.orders),
    true,
  );
  TestValidator.equals(
    "reviews is array",
    Array.isArray(retrievedCustomer.reviews),
    true,
  );
  TestValidator.equals(
    "cancellationRequests is array",
    Array.isArray(retrievedCustomer.cancellationRequests),
    true,
  );
  TestValidator.equals(
    "refundRequests is array",
    Array.isArray(retrievedCustomer.refundRequests),
    true,
  );
  // 7. Validate wishlist and cart exist
  TestValidator.equals(
    "wishlist exists",
    retrievedCustomer.wishlist !== null &&
      retrievedCustomer.wishlist !== undefined,
    true,
  );
  TestValidator.equals(
    "cart exists",
    retrievedCustomer.cart !== null && retrievedCustomer.cart !== undefined,
    true,
  );
  // 8. Verify password_hash is NOT present in response (security requirement)
  TestValidator.equals(
    "password_hash not in response",
    "password_hash" in retrievedCustomer,
    false,
  );
}
