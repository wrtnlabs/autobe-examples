import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate that admin can remove a seller's secondary email address, given only
 * endpoints for admin and seller creation and deletion by userEmailId.
 *
 * 1. Register a new admin via the admin join API; authenticate as admin.
 * 2. Register a new seller.
 * 3. Simulate existence of a secondary user email (as the API provides no endpoint
 *    to create or list secondary emails).
 * 4. Admin erases this secondary email by uuid using the userEmails.erase
 *    endpoint.
 * 5. No negative or state assertion is possible since there is no endpoint for
 *    primary/verified email handling.
 */
export async function test_api_admin_remove_seller_secondary_email(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(seller);

  // 3. Simulate creation of secondary user email (since there's no API for it, we generate a random id)
  const secondaryUserEmailId = typia.random<string & tags.Format<"uuid">>();

  // 4. Admin erases secondary email
  await api.functional.shopping.admin.userEmails.erase(connection, {
    userEmailId: secondaryUserEmailId,
  });
}
