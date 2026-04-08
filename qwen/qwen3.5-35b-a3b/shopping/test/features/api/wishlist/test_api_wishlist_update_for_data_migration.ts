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

export async function test_api_wishlist_update_for_data_migration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A (current wishlist owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(customerAConnection, {
      body: typia.random<IEcommerceMallMember.IJoin>(),
    });
  typia.assert(customerA);
  // 2. Create Customer B (new wishlist owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(customerBConnection, {
      body: typia.random<IEcommerceMallMember.IJoin>(),
    });
  typia.assert(customerB);
  // 3. Create a wishlist on Customer A
  // Using an existing wishlist ID to simulate the data migration scenario
  const existingWishlistId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // First, create initial wishlist on Customer A by making a PUT request with customer_id
  const initialWishlist: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.update(
      customerAConnection,
      {
        wishlistId: existingWishlistId,
        body: { customer_id: customerA.id },
      },
    );
  typia.assert(initialWishlist);
  const originalCreatedAt: string & tags.Format<"date-time"> =
    initialWishlist.created_at;
  const originalWishlistId: string & tags.Format<"uuid"> = initialWishlist.id;
  const originalCustomerId: string & tags.Format<"uuid"> =
    initialWishlist.customer.id;
  TestValidator.equals(
    "initial customer owner",
    originalCustomerId,
    customerA.id,
  );
  TestValidator.equals(
    "wishlist ID preserved",
    originalWishlistId,
    existingWishlistId,
  );
  // 4. Update wishlist to transfer ownership to Customer B
  const updatedWishlist: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.update(
      customerAConnection,
      {
        wishlistId: existingWishlistId,
        body: { customer_id: customerB.id },
      },
    );
  typia.assert(updatedWishlist);
  // 5. Validate transfer results
  const newCustomerId: string & tags.Format<"uuid"> =
    updatedWishlist.customer.id;
  TestValidator.equals(
    "customer_id updated to Customer B",
    newCustomerId,
    customerB.id,
  );
  TestValidator.equals(
    "wishlist ID unchanged after transfer",
    updatedWishlist.id,
    originalWishlistId,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedWishlist.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at timestamp modified",
    initialWishlist.updated_at,
    updatedWishlist.updated_at,
  );
  TestValidator.equals(
    "customer relation shows new owner",
    updatedWishlist.customer.id,
    customerB.id,
  );
  TestValidator.equals(
    "customer email reflects new owner",
    updatedWishlist.customer.email,
    customerB.email,
  );
  TestValidator.equals(
    "wishlist items preserved during transfer",
    updatedWishlist.items.length,
    initialWishlist.items.length,
  );
  // 6. Validate updated_at is recent timestamp
  TestValidator.predicate("updated_at is recent timestamp", () => {
    const now = new Date();
    const updatedAt = new Date(updatedWishlist.updated_at);
    const diff = now.getTime() - updatedAt.getTime();
    // Updated at should be within last minute
    return diff >= 0 && diff < 60 * 1000;
  });
}