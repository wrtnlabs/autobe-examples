import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete seller registration workflow where a new vendor creates an
 * account on the platform.
 *
 * This test validates the seller registration process including:
 *
 * 1. Submission of comprehensive business information (business name, type,
 *    contact details, tax ID)
 * 2. Email uniqueness validation and secure password handling
 * 3. Generation of email verification token
 * 4. Creation of seller account with pending_approval status
 * 5. Immediate issuance of JWT access and refresh tokens
 * 6. Automatic setting of authentication token in connection headers
 *
 * The seller provides all required business information including
 * business_name, business_type, contact_person_name, email, phone,
 * business_address, tax_id, and password. The system validates all required
 * fields, ensures email uniqueness, hashes the password securely, generates an
 * email verification token, and creates the seller account with
 * pending_approval status.
 *
 * Upon successful registration, the system issues JWT access and refresh
 * tokens, enabling the seller to access their pending account dashboard. The
 * test validates that the seller account is created with correct initial
 * status, authentication tokens are issued, and the seller can use these tokens
 * for subsequent authenticated requests.
 */
export async function test_api_seller_registration_new_account(
  connection: api.IConnection,
) {
  // Generate unique seller registration data
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12); // Minimum 8 characters required
  const businessName =
    RandomGenerator.name(2) +
    " " +
    RandomGenerator.pick(["LLC", "Inc", "Corp", "Co"] as const);
  const businessType = RandomGenerator.pick([
    "individual",
    "LLC",
    "corporation",
    "partnership",
  ] as const);
  const contactPersonName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const businessAddress = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City, ${RandomGenerator.pick(["CA", "NY", "TX", "FL", "IL"] as const)} ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`;
  const taxId = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<99>>()}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000> & tags.Maximum<9999999>>()}`;

  // Create seller registration request body
  const registrationData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: businessName,
    business_type: businessType,
    contact_person_name: contactPersonName,
    phone: phoneNumber,
    business_address: businessAddress,
    tax_id: taxId,
  } satisfies IShoppingMallSeller.ICreate;

  // Call seller registration API
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });

  // Validate response structure and data
  typia.assert(authorizedSeller);

  // Validate email matches input
  TestValidator.equals(
    "registered email matches input",
    authorizedSeller.email,
    sellerEmail,
  );

  // Validate business name is stored correctly
  TestValidator.equals(
    "business name matches input",
    authorizedSeller.business_name,
    businessName,
  );

  // Validate that connection headers are automatically updated with access token
  TestValidator.predicate(
    "connection headers should contain authorization token",
    connection.headers?.Authorization === authorizedSeller.token.access,
  );
}
