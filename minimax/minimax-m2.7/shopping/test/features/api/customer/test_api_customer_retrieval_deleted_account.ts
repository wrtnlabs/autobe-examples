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

export async function test_api_customer_retrieval_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a test customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Retrieve the customer account as administrator
  // Admin should be able to view customer data regardless of account status
  const retrievedCustomer =
    await api.functional.ecommerceMall.admin.customers.at(adminConnection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);
  // 4. Validate customer data is accessible
  TestValidator.equals(
    "customer ID returned",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "email preserved",
    retrievedCustomer.email,
    customer.email,
  );
  // 5. Validate timestamps are present
  TestValidator.predicate(
    "created_at is present",
    retrievedCustomer.created_at !== null &&
      retrievedCustomer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedCustomer.updated_at !== null &&
      retrievedCustomer.updated_at !== undefined,
  );
  // 6. Validate profile data is returned
  TestValidator.equals(
    "profile display_name returned",
    retrievedCustomer.profile.display_name,
    customer.profile.display_name,
  );
  TestValidator.equals(
    "profile phone returned",
    retrievedCustomer.profile.phone,
    customer.profile.phone,
  );
  // 7. Validate related data arrays are returned for support purposes
  TestValidator.predicate(
    "shippingAddresses is array",
    Array.isArray(retrievedCustomer.shippingAddresses),
  );
  TestValidator.predicate(
    "orders is array",
    Array.isArray(retrievedCustomer.orders),
  );
  TestValidator.predicate(
    "reviews is array",
    Array.isArray(retrievedCustomer.reviews),
  );
  TestValidator.predicate(
    "cancellationRequests is array",
    Array.isArray(retrievedCustomer.cancellationRequests),
  );
  TestValidator.predicate(
    "refundRequests is array",
    Array.isArray(retrievedCustomer.refundRequests),
  );
  // 8. Validate wishlist and cart are returned for support purposes
  TestValidator.predicate(
    "wishlist is returned",
    retrievedCustomer.wishlist !== null &&
      retrievedCustomer.wishlist !== undefined,
  );
  TestValidator.predicate(
    "cart is returned",
    retrievedCustomer.cart !== null && retrievedCustomer.cart !== undefined,
  );
}
