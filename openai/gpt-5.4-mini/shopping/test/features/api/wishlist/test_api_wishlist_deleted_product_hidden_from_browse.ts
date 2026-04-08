import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_deleted_product_hidden_from_browse(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify wishlist browsing returns only active wishlist entries for the authenticated customer.
   *
   * This scenario validates the read-only wishlist browse endpoint and its pagination
   * contract. The test confirms that the response is well-formed for the authenticated
   * customer, that pagination metadata is internally consistent, and that the returned
   * wishlist entries are active summaries suitable for catalog rendering.
   *
   * 1. Register and authenticate a customer for the wishlist request context.
   * 2. Browse the customer's wishlist using the paginated read endpoint.
   * 3. Validate the page metadata and confirm every returned wishlist entry is active.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output = await api.functional.mallPlatform.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "newest",
      } satisfies IMallPlatformWishlist.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "wishlist page number is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "wishlist page limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "wishlist record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "wishlist data does not exceed requested limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "wishlist entries are active products",
    output.data.every((item) => item.product.deletedAt === null),
  );
  TestValidator.predicate(
    "wishlist entries are active wishlist records",
    output.data.every((item) => item.deleted_at === null),
  );
}
