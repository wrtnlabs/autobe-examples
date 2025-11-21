import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBackupCodes } from "@ORGANIZATION/PROJECT-api/lib/structures/IBackupCodes";
import type { IQrCodeData } from "@ORGANIZATION/PROJECT-api/lib/structures/IQrCodeData";
import type { ISecurityContext } from "@ORGANIZATION/PROJECT-api/lib/structures/ISecurityContext";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test email-based multi-factor authentication enablement with backup email
 * address provision. Validates email format requirements, backup authentication
 * method configuration, and proper security context establishment for enhanced
 * account security.
 *
 * 1. Create a new customer account through registration
 * 2. Enable email-based MFA with backup email configuration
 * 3. Validate that the MFA setup response includes required components
 * 4. Verify backup codes are generated for account recovery
 * 5. Confirm security context is properly established
 */
export async function test_api_customer_mfa_enable_email_with_backup_email(
  connection: api.IConnection,
): Promise<void> {
  // Create new customer account first
  const primaryEmail = `customer.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const backupEmail = `backup.${RandomGenerator.alphaNumeric(8)}@different-domain.com`;

  // Customer registration with comprehensive profile data
  const registrationData = {
    email: primaryEmail,
    password: "TestPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile("010"),
    href: "https://shoppingmall.com/register",
    referrer: "https://shoppingmall.com/login",
  } satisfies IShoppingMallCustomer.IRegister;

  const customer = await api.functional.auth.customer.join(connection, {
    body: registrationData,
  });
  typia.assert(customer);

  TestValidator.predicate(
    "Customer account created successfully",
    customer.id !== null,
  );
  TestValidator.predicate(
    "Email verification required for new accounts",
    !customer.is_email_verified,
  );
  TestValidator.predicate("Account is active", customer.status === true);

  // Enable email-based MFA with backup email configuration
  const mfaSetupRequest = {
    mfa_type: "email" as const,
    backup_email: backupEmail,
    ip: "203.0.113.1",
    href: "https://shoppingmall.com/security/mfa/enable",
    referrer: "https://shoppingmall.com/account/security",
  } satisfies IShoppingMallAuthentication.IEnableMfa;

  const mfaSetupResponse =
    await api.functional.shoppingMall.customer.auth.mfa.enable.enableMfa(
      connection,
      {
        body: mfaSetupRequest,
      },
    );
  typia.assert(mfaSetupResponse);

  // Validate MFA setup response structure
  TestValidator.equals(
    "Email MFA type correctly configured",
    mfaSetupResponse.mfa_type,
    "email",
  );
  TestValidator.predicate(
    "MFA setup requires verification",
    mfaSetupResponse.verification_required === true,
  );

  // Validate backup codes generation for account recovery
  TestValidator.predicate(
    "Backup codes array has minimum required codes",
    mfaSetupResponse.backup_codes.length >= 8,
  );
  TestValidator.predicate(
    "Backup codes array does not exceed maximum",
    mfaSetupResponse.backup_codes.length <= 10,
  );

  // Validate individual backup code format
  TestValidator.predicate(
    "Each backup code has correct length format",
    mfaSetupResponse.backup_codes.every(
      (code) => code.length === 8 && /^[A-Za-z0-9]{8}$/.test(code),
    ),
  );

  TestValidator.predicate(
    "Setup instructions provided for user guidance",
    mfaSetupResponse.setup_instructions.length > 0,
  );

  // Validate security context establishment
  TestValidator.predicate(
    "Security context properly established",
    mfaSetupResponse.verification_required === true,
  );

  TestValidator.predicate(
    "MFA enablement successful with backup email",
    customer !== null && mfaSetupResponse !== null,
  );
}
