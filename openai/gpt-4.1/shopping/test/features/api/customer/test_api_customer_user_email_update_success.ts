import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";

/**
 * Validate successful updating of a customer user's email details.
 *
 * 1. Register a new customer account.
 * 2. Update the primary user email to a new unique value, set as verified/primary.
 * 3. Verify the update is correctly reflected on user email record.
 */
export async function test_api_customer_user_email_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const email1 = typia.random<string & tags.Format<"email">>();
  const baseHref = "https://test-shopping.example.com/";
  const baseReferrer = "https://google.com/";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email1,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: baseHref,
        referrer: baseReferrer,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);
  TestValidator.equals("customer email equals input", customer.email, email1);

  // 2. Update the primary email record (changing to new unique email, set is_verified and is_primary)
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedIsVerified = true;
  const updatedIsPrimary = true;
  const now = new Date().toISOString();
  const userEmailRecord: IShoppingUserEmail =
    await api.functional.shopping.customer.userEmails.update(connection, {
      userEmailId: customer.id as string & tags.Format<"uuid">,
      body: {
        email: updatedEmail,
        is_verified: updatedIsVerified,
        is_primary: updatedIsPrimary,
        updated_at: now,
      } satisfies IShoppingUserEmail.IUpdate,
    });
  typia.assert(userEmailRecord);
  TestValidator.equals(
    "user email updated email matches input",
    userEmailRecord.email,
    updatedEmail,
  );
  TestValidator.predicate(
    "user email is verified true",
    userEmailRecord.is_verified,
  );
  TestValidator.predicate(
    "user email is primary true",
    userEmailRecord.is_primary,
  );
  TestValidator.equals(
    "user email owner id equals customer",
    userEmailRecord.shopping_customer_id,
    customer.id,
  );
}
