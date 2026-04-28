import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cart items listing with variant_id filter parameter.
 *
 * Validates that the authenticated customer's cart items listing endpoint
 * correctly filters results by the optional product variant identifier.
 * Verifies that the variant_id filter maps to the database query, returns
 * properly structured responses with pagination metadata, and ensures
 * all returned items match the filter constraint.
 *
 * 1. Customer registers and authenticates.
 * 2. Customer lists cart items with a variant_id filter.
 * 3. Validates response structure, pagination metadata, and filter constraint.
 */
export async function test_api_cart_listing_filtered_by_product_variant_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Generate a variant_id to filter by
  const filterVariantId = typia.random<string & tags.Format<"uuid">>();
  // 3. List cart items with variant_id filter
  const body = {
    variant_id: filterVariantId,
  } satisfies IEcommercePlatformShoppingCartItem.IRequest;
  const page = await api.functional.ecommercePlatform.customer.cart_items.index(
    customerConnection,
    { body },
  );
  typia.assert(page);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    page.pagination.current >= 1,
  );
  // 5. Validate filter constraint - all returned items match the variant_id
  for (const cartItem of page.data) {
    TestValidator.equals(
      "cart item variant matches filter variant_id",
      cartItem.variant.id,
      filterVariantId,
    );
  }
  // 6. Data array length should not exceed pagination records
  TestValidator.predicate(
    "data array length does not exceed pagination records",
    page.data.length <= page.pagination.records,
  );
}
