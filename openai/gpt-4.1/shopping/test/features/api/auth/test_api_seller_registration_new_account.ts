import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the registration of a new seller account.
 *
 * This test:
 *
 * 1. Registers a new seller with unique onboarding/KYC business credentials --
 *    unique email, registration number, business name, business phone,
 *    password, and session context fields.
 * 2. Ensures on success a seller account is created, with compliant business and
 *    KYC data, and seller receives JWT access and refresh tokens.
 * 3. Verifies business logic enforcement for unique email and registration_number:
 *    attempts to register with duplicate email or duplicate registration_number
 *    must fail with error.
 * 4. Asserts the returned payload includes all compliance-related information with
 *    token structure, business identity, and registration context.
 */
export async function test_api_seller_registration_new_account(
  connection: api.IConnection,
) {
  // 1. Seller registration data generation (all required fields)
  const email = typia.random<string & tags.Format<"email">>();
  const registration_number = RandomGenerator.alphaNumeric(12);
  const business_name = RandomGenerator.name(3);
  const business_phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://seller-onboarding.example.com/signup";
  const referrer = "https://seller-onboarding.example.com/start";

  // 2. Register seller successfully
  const registration = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      business_name,
      registration_number,
      business_phone,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
      ip: null, // simulate unattached client IP optionally
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(registration);

  // 3. Assert account and token payload structure compliance
  TestValidator.equals("registration email", registration.email, email);
  TestValidator.equals(
    "registration business_name",
    registration.business_name,
    business_name,
  );
  TestValidator.equals(
    "registration_number",
    registration.registration_number,
    registration_number,
  );
  TestValidator.equals(
    "business_phone",
    registration.business_phone,
    business_phone,
  );
  TestValidator.predicate(
    "is_email_verified should be false or boolean",
    typeof registration.is_email_verified === "boolean",
  );
  TestValidator.predicate(
    "status present",
    typeof registration.status === "string" && !!registration.status.length,
  );
  TestValidator.predicate(
    "created_at datetime",
    typeof registration.created_at === "string" &&
      !!registration.created_at.length,
  );
  TestValidator.predicate(
    "updated_at datetime",
    typeof registration.updated_at === "string" &&
      !!registration.updated_at.length,
  );
  typia.assert(registration.token);
  typia.assert(registration.token.access);
  typia.assert(registration.token.refresh);

  // If present, validate seller summary
  if (registration.seller) {
    typia.assert(registration.seller);
    TestValidator.equals(
      "seller id matches",
      registration.seller.id,
      registration.id,
    );
    TestValidator.equals(
      "seller business_name matches",
      registration.seller.business_name,
      business_name,
    );
  }

  // 4. Attempt duplicate registration with same email
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email,
          password: password as string & tags.Format<"password">,
          business_name: RandomGenerator.name(3), // change business name
          registration_number: RandomGenerator.alphaNumeric(12), // new reg num
          business_phone: RandomGenerator.mobile(),
          href: href as string & tags.Format<"uri">,
          referrer: referrer as string & tags.Format<"uri">,
          ip: null,
        } satisfies IShoppingMallSeller.ICreate,
      });
    },
  );

  // 5. Attempt duplicate registration with same registration number
  await TestValidator.error(
    "duplicate registration_number rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // new email
          password: password as string & tags.Format<"password">,
          business_name: RandomGenerator.name(3),
          registration_number,
          business_phone: RandomGenerator.mobile(),
          href: href as string & tags.Format<"uri">,
          referrer: referrer as string & tags.Format<"uri">,
          ip: null,
        } satisfies IShoppingMallSeller.ICreate,
      });
    },
  );
}
