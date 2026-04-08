import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_browse_saved_products(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `wishlist-${RandomGenerator.alphaNumeric(8)}@test.com` as string,
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const response =
    await api.functional.mallPlatform.customer.wishlists.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformWishlistItem.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination metadata is present",
    response.pagination.current >= 1 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (const item of response.data) {
    typia.assert(item);
    typia.assert(item.wishlist);
    typia.assert(item.product);
    TestValidator.predicate(
      "wishlist item id is populated",
      item.id.length > 0,
    );
    TestValidator.predicate(
      "wishlist relation id is populated",
      item.wishlist.id.length > 0,
    );
    TestValidator.predicate(
      "product id is populated",
      item.product.id.length > 0,
    );
    TestValidator.predicate(
      "product name is populated",
      item.product.name.length > 0,
    );
    TestValidator.predicate(
      "product seller reference exists",
      item.product.sellerAccount.id.length > 0,
    );
  }
}
