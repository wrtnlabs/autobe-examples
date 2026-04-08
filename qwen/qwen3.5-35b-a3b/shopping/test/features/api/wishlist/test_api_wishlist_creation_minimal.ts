import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_member_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Test minimal wishlist creation for authenticated member customer.
 *
 * Validates the basic wishlist creation workflow with an empty body, ensuring that the API creates a wishlist record with only system-managed fields. The test confirms that customers can create wishlists without requiring any body parameters, and that the response contains all system-generated identifiers and timestamps.
 *
 * Special attention is given to verifying that all timestamps are properly set, the customer object is included with full member details, and the empty items array is initialized correctly. The test validates the fundamental wishlist entity structure as defined in the API specifications.
 *
 * 1. Member registers new account via authorize_member_join utility function.
 * 2. Member authenticates and receives JWT access token.
 * 3. Actor-specific connection created with token for member operations.
 * 4. Wishlist created with empty body (API requires no parameters).
 * 5. Validates response includes id, timestamps, customer object, empty items array.
 */
export async function test_api_wishlist_creation_minimal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as new member
  const joinConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create actor-specific connection with token for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: authResult.token.access };
  // 3. Create wishlist with empty body (API accepts no parameters)
  const wishlist = await api.functional.ecommerceMall.member.wishlists.create(
    memberConnection,
    {
      body: {} satisfies IEcommerceMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);
  // 4. Validate wishlist creation response
  TestValidator.notEquals("wishlist has id", wishlist.id, null);
  TestValidator.notEquals(
    "created_at timestamp set",
    wishlist.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at timestamp set",
    wishlist.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    wishlist.deleted_at,
    null,
  );
  TestValidator.notEquals("customer object exists", wishlist.customer, null);
  TestValidator.equals(
    "customer has display_name",
    wishlist.customer.display_name,
    authResult.display_name,
  );
  TestValidator.equals("customer has id", wishlist.customer.id, authResult.id);
  TestValidator.equals("items array is empty", wishlist.items.length, 0);
}
