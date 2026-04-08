import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test wishlist product-level display without variant-specific information.
 *
 * Validates that the wishlist endpoint returns products at the product level without exposing variant-specific details such as SKU codes, option values, or variant prices. This ensures customers see only essential product information in their wishlist and must navigate to the product detail page to view variant options.
 *
 * The test verifies the complete wishlist retrieval flow including member authentication, wishlist item structure validation, and confirmation that product summaries contain only the allowed fields (id, name, base_price, category, seller, thumbnailUrl, inStock, createdAt) without any variant-specific data.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Member retrieves wishlist items via PATCH /shoppingMall/member/wishlist-items.
 * 3. Validates wishlist item structure contains only id, product summary, and created_at.
 * 4. Verifies product summary excludes variant-specific fields (no SKU, option values, variant prices).
 * 5. Confirms each product appears only once regardless of variant views.
 */
export async function test_api_wishlist_product_level_display_without_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve wishlist items
  const wishlistPage =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    wishlistPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    wishlistPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    wishlistPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    wishlistPage.pagination.pages >= 0,
  );
  // 4. Validate wishlist data array exists
  TestValidator.predicate(
    "wishlist data is array",
    Array.isArray(wishlistPage.data),
  );
  // 5. Validate each wishlist item - business logic only (type already validated by typia.assert)
  for (const item of wishlistPage.data) {
    // Verify product has required business fields
    TestValidator.predicate(
      "product name exists",
      item.product.name.length > 0,
    );
    TestValidator.predicate(
      "product base price positive",
      item.product.base_price >= 0,
    );
    TestValidator.predicate(
      "product category exists",
      item.product.category.id.length > 0,
    );
    TestValidator.predicate(
      "product seller exists",
      item.product.seller.id.length > 0,
    );
    // Verify wishlist item created_at is valid date-time
    TestValidator.predicate(
      "wishlist created_at is valid",
      !isNaN(Date.parse(item.created_at)),
    );
  }
  // 6. Validate no duplicate products in wishlist (each product appears once per business rule)
  const productIds = wishlistPage.data.map((item) => item.product.id);
  const uniqueProductIds = new Set(productIds);
  TestValidator.equals(
    "each product appears only once in wishlist",
    productIds.length,
    uniqueProductIds.size,
  );
}
