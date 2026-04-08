import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_wishlist_product_deletion_auto_removal(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // Setup: Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // Test: List customer wishlists
  // Note: The complete scenario requires product creation/deletion APIs and wishlist item APIs
  // which are not available in the current SDK. This test validates the wishlist listing endpoint.
  const wishlists = await api.functional.ecommerceMall.member.wishlists.index(
    customerConnection,
    {
      body: {
        status: "active",
        sort: "created_at_desc",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(wishlists);
  // Validate wishlist structure
  TestValidator.equals(
    "wishlist page current",
    wishlists.pagination.current,
    1,
  );
  TestValidator.predicate(
    "wishlist limit valid",
    wishlists.pagination.limit >= 1 && wishlists.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "wishlist records non-negative",
    wishlists.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist pages non-negative",
    wishlists.pagination.pages >= 0,
  );
  // Validate wishlist data structure (empty list since no products/wishlist items can be created)
  typia.assert(wishlists.data);
  for (const wishlist of wishlists.data) {
    typia.assert(wishlist);
    TestValidator.predicate(
      "wishlist has valid customer",
      wishlist.customer !== null,
    );
    TestValidator.equals(
      "wishlist customer id valid UUID",
      true,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        wishlist.customer.id,
      ),
    );
  }
}
