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
 * Test member wishlist product retrieval with pagination and product summary validation.
 *
 * Validates the complete wishlist retrieval flow including member authentication, paginated response structure, and product summary data integrity. Ensures that wishlist items contain all required product information including category, seller, and thumbnail information.
 *
 * Special attention is given to verifying that the response follows the expected structure with pagination metadata and wishlist items containing complete product summaries with all nested relations properly loaded.
 *
 * 1. Member registers with unique email and credentials.
 * 2. Member retrieves their wishlist with default pagination.
 * 3. Validates paginated response structure with pagination metadata and data array.
 * 4. Validates each wishlist item contains required product summary fields through typia assertion.
 * 5. Validates created_at timestamp format for each wishlist item.
 */
export async function test_api_wishlist_member_retrieve_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Retrieve wishlist
  const wishlist =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlist);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    wishlist.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", wishlist.pagination.limit === 10);
  TestValidator.predicate(
    "records is non-negative",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    wishlist.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    wishlist.pagination.pages ===
      Math.ceil(wishlist.pagination.records / wishlist.pagination.limit),
  );
  // 4. Validate wishlist items if any exist
  if (wishlist.data.length > 0) {
    for (const item of wishlist.data) {
      // Validate product nested relations exist
      TestValidator.predicate(
        "product category exists",
        item.product.category !== null,
      );
      TestValidator.predicate(
        "product seller exists",
        item.product.seller !== null,
      );
      // Validate category has parent (can be null for top-level)
      TestValidator.predicate(
        "category id is valid uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.product.category.id,
        ),
      );
      // Validate seller has required fields
      TestValidator.predicate(
        "seller email is valid format",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.product.seller.email),
      );
      // Validate timestamps are valid ISO 8601 format
      TestValidator.predicate(
        "wishlist created_at is valid datetime",
        !isNaN(Date.parse(item.created_at)),
      );
      TestValidator.predicate(
        "product createdAt is valid datetime",
        !isNaN(Date.parse(item.product.createdAt)),
      );
      TestValidator.predicate(
        "category created_at is valid datetime",
        !isNaN(Date.parse(item.product.category.created_at)),
      );
      TestValidator.predicate(
        "seller createdAt is valid datetime",
        !isNaN(Date.parse(item.product.seller.createdAt)),
      );
    }
  }
}
