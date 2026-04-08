import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_wishlist } from "../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Generate a random wishlist for the e-commerce platform for E2E testing.
 *
 * Prepares random wishlist data using the prepare function, then calls the creation endpoint to create a new wishlist associated with the authenticated member customer. Returns the created wishlist with its ID, name, description, timestamps, customer reference, and list of associated products.
 */
export async function generate_random_ecommerce_mall_member_wishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlist.ICreate>;
  },
): Promise<IEcommerceMallWishlist> {
  const prepared: IEcommerceMallWishlist.ICreate =
    prepare_random_ecommerce_mall_wishlist(props.body);
  const result: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.create(connection, {
      body: prepared,
    });
  return result;
}
