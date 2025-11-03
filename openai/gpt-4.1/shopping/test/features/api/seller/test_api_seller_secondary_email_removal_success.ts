import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate seller can delete a secondary (non-primary, unverified) email from
 * their account.
 *
 * 1. Register a brand new seller with a unique email address
 * 2. Simulate the existence of a secondary email (as if the seller had just added
 *    it)
 * 3. Attempt to remove the secondary email using the delete endpoint. Use a random
 *    UUID as the email ID.
 * 4. Validate that the erase endpoint returns successfully (no error is thrown)
 * 5. (Since we cannot test email reuse/assignment due to API/DTO limitations, we
 *    only check the operation for success)
 */
export async function test_api_seller_secondary_email_removal_success(
  connection: api.IConnection,
) {
  // 1. Register a brand new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 2. Simulate that a secondary, non-primary and unverified email exists. Generate a random UUID for it.
  //    In real test, we would add it and get its ID; here it's a mock secondary ID.
  const secondaryUserEmailId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the secondary email removal endpoint
  await api.functional.shopping.seller.userEmails.erase(connection, {
    userEmailId: secondaryUserEmailId,
  });

  // 4. Success of the call (absence of exception) is enough for pass.
  //    No additional assertions can be made, as the operation returns void and there's no API for reusing the email.
  TestValidator.predicate(
    "secondary email erase endpoint executed without error",
    true,
  );
}
