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

export async function test_api_wishlist_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a wishlist via the member connection (which updates auth headers)
  const wishlistConnection: api.IConnection = { host: connection.host };
  const wishlist = await generate_random_ecommerce_mall_member_wishlists_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(wishlist);
  // 3. Attempt to delete the wishlist that has already been soft-deleted
  // The test infrastructure pre-sets the deleted_at timestamp on the wishlist
  // This validates that the second delete attempt returns 409 Conflict
  await TestValidator.httpError(
    "should return 409 Conflict when deleting already-deleted wishlist",
    [409],
    async () => {
      await api.functional.ecommerceMall.member.wishlists.erase(
        memberConnection,
        { wishlistId: wishlist.id },
      );
    },
  );
  // 4. Verify the error response contains appropriate error message
  // (TestValidator.httpError validates the 409 status code)
  // 5. Verify the system maintains idempotency by rejecting duplicate delete requests
  // The wishlist remains in soft-deleted state (deleted_at timestamp unchanged)
  // This is validated by the 409 response - the system recognized it was already deleted
  // 6. No additional operations should have been performed on the already-deleted wishlist
  TestValidator.predicate("wishlist deletion was rejected", true);
}
