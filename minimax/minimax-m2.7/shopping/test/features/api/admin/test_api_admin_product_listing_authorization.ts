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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
 * Test that only administrators can access the admin product listing endpoint while other user roles receive authorization errors.
 *
 * Validates the authorization enforcement for the GET /ecommerceMall/admin/admin/products endpoint. This endpoint should only be accessible to authenticated administrators, rejecting requests from customers and sellers with appropriate HTTP error status codes.
 *
 * 1. Customer attempts to access admin product listing → 401/403 unauthorized
 * 2. Seller attempts to access admin product listing → 401/403 unauthorized
 * 3. Admin successfully accesses admin product listing → 200 OK with paginated products
 * 4. Validates response contains proper pagination metadata (current, limit, records, pages)
 * 5. Validates product summaries contain expected fields (id, name, basePrice, categoryName, hasStock, seller, timestamps)
 */
export async function test_api_admin_product_listing_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer attempts to access admin product listing
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: customerCredentials,
  });
  // Customer should NOT be able to access admin endpoint
  await TestValidator.httpError(
    "customer cannot access admin product listing",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.admin.admin.products.list(
        customerConnection,
      ),
  );
  // Step 2: Seller attempts to access admin product listing
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: sellerCredentials,
  });
  // Seller should NOT be able to access admin endpoint
  await TestValidator.httpError(
    "seller cannot access admin product listing",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.admin.admin.products.list(
        sellerConnection,
      ),
  );
  // Step 3: Admin successfully accesses admin product listing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: adminCredentials,
  });
  // Admin should successfully access admin endpoint
  const productList =
    await api.functional.ecommerceMall.admin.admin.products.list(
      adminConnection,
    );
  typia.assert(productList);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "response has pagination metadata",
    productList.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    typeof productList.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof productList.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof productList.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof productList.pagination.pages === "number",
  );
  // Validate data array structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(productList.data),
  );
  // Validate product summary structure if data exists
  if (productList.data.length > 0) {
    const product = productList.data[0];
    TestValidator.predicate("product has id", product.id !== undefined);
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has basePrice",
      typeof product.basePrice === "number",
    );
    TestValidator.predicate(
      "product has categoryName",
      product.categoryName !== undefined,
    );
    TestValidator.predicate(
      "product has hasStock",
      typeof product.hasStock === "boolean",
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt !== undefined,
    );
    TestValidator.predicate(
      "product has updatedAt",
      product.updatedAt !== undefined,
    );
  }
}
