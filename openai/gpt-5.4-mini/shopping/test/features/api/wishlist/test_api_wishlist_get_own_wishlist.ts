import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_get_own_wishlist(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const wishlistItem =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      {
        body: {
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  const wishlist = await api.functional.mallPlatform.customer.wishlists.at(
    customerConnection,
    {
      wishlistId: wishlistItem.wishlist.id,
    },
  );
  typia.assert(wishlist);
  TestValidator.equals("wishlist owner id", wishlist.customer.id, customer.id);
  TestValidator.equals(
    "wishlist owner email",
    wishlist.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "wishlist owner status",
    wishlist.customer.status,
    customer.status,
  );
  TestValidator.equals(
    "wishlist owner createdAt",
    wishlist.customer.created_at,
    customer.createdAt,
  );
  TestValidator.equals(
    "wishlist owner updatedAt",
    wishlist.customer.updated_at,
    customer.updatedAt,
  );
  TestValidator.equals(
    "wishlist owner deletedAt",
    wishlist.customer.deleted_at,
    customer.deletedAt,
  );
  TestValidator.equals("wishlist id", wishlist.id, wishlistItem.wishlist.id);
  TestValidator.equals(
    "wishlist created_at",
    wishlist.created_at,
    wishlistItem.wishlist.createdAt,
  );
  TestValidator.equals(
    "wishlist updated_at",
    wishlist.updated_at,
    wishlistItem.wishlist.updatedAt,
  );
  TestValidator.equals(
    "wishlist deleted_at",
    wishlist.deleted_at,
    wishlistItem.wishlist.deletedAt,
  );
  TestValidator.predicate(
    "wishlist contains saved product items",
    wishlist.wishlistItems.length > 0,
  );
  const item = wishlist.wishlistItems[0];
  TestValidator.equals("wishlist item id", item.id, wishlistItem.id);
  TestValidator.equals("nested wishlist id", item.wishlist.id, wishlist.id);
  TestValidator.equals(
    "nested wishlist customer id",
    item.wishlist.customer.id,
    wishlist.customer.id,
  );
  TestValidator.equals(
    "nested wishlist customer email",
    item.wishlist.customer.email,
    wishlist.customer.email,
  );
  TestValidator.equals(
    "nested wishlist customer status",
    item.wishlist.customer.status,
    wishlist.customer.status,
  );
  TestValidator.equals(
    "nested wishlist product id",
    item.product.id,
    wishlistItem.product.id,
  );
  TestValidator.equals(
    "nested wishlist product name",
    item.product.name,
    wishlistItem.product.name,
  );
  TestValidator.equals(
    "nested wishlist product description",
    item.product.description,
    wishlistItem.product.description,
  );
  TestValidator.equals(
    "nested wishlist product basePrice",
    item.product.basePrice,
    wishlistItem.product.basePrice,
  );
  TestValidator.equals(
    "nested wishlist product seller id",
    item.product.sellerAccount.id,
    wishlistItem.product.sellerAccount.id,
  );
  TestValidator.equals(
    "nested wishlist product seller email",
    item.product.sellerAccount.email,
    wishlistItem.product.sellerAccount.email,
  );
  TestValidator.equals(
    "nested wishlist product approval status",
    item.product.sellerAccount.approvalStatus,
    wishlistItem.product.sellerAccount.approvalStatus,
  );
  TestValidator.equals(
    "nested wishlist product rejection reason",
    item.product.sellerAccount.rejectionReason,
    wishlistItem.product.sellerAccount.rejectionReason,
  );
  TestValidator.equals(
    "nested wishlist product seller suspendedAt",
    item.product.sellerAccount.suspendedAt,
    wishlistItem.product.sellerAccount.suspendedAt,
  );
  TestValidator.equals(
    "nested wishlist product seller deletedAt",
    item.product.sellerAccount.deletedAt,
    wishlistItem.product.sellerAccount.deletedAt,
  );
  TestValidator.equals(
    "nested wishlist product category",
    item.product.category,
    wishlistItem.product.category,
  );
  TestValidator.equals(
    "nested wishlist item createdAt",
    item.createdAt,
    wishlistItem.createdAt,
  );
  TestValidator.equals(
    "nested wishlist item updatedAt",
    item.updatedAt,
    wishlistItem.updatedAt,
  );
  TestValidator.equals(
    "nested wishlist item deletedAt",
    item.deletedAt,
    wishlistItem.deletedAt,
  );
}
