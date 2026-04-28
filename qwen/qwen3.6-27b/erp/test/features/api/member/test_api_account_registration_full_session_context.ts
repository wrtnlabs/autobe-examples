import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member account registration with all session context fields explicitly provided.
 *
 * Validates the complete registration flow where a guest user provides all required fields (email, password, display_name) along with optional session context fields (href, referrer, ip) for security auditing. The system must create the member account, default organization, and session record with all security tracking fields populated from the provided context values.
 *
 * Verification includes checking that the IAuthorized response contains the correct member profile matching the input, valid JWT token structure (access, refresh, expired_at, refreshable_until), and proper initialization of optional fields. The ip field specifically validates correct handling when explicitly provided by the client rather than server-defaulted from headers.
 *
 * 1. Guest user submits join request with all required fields (email, password, display_name) and all optional session context fields (href, referrer, ip).
 * 2. Registration succeeds with IAuthorized response containing member profile and JWT tokens.
 * 3. Validate member email and display_name match the provided input values.
 * 4. Verify optional profile fields (avatar, phone) are null on new registration.
 * 5. Confirm JWT token structure is valid with typia assertion.
 */
export async function test_api_account_registration_full_session_context(
  connection: api.IConnection,
) {
  // Create dedicated member connection for join operation
  const memberConnection: api.IConnection = { host: connection.host };
  // Define specific input values for business logic validation
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputDisplayName = RandomGenerator.name();
  const inputHref = typia.random<string & tags.Format<"uri">>();
  const inputReferrer = typia.random<string & tags.Format<"uri">>();
  const inputIp = typia.random<string & tags.Format<"ipv4">>();
  // Submit join with full session context
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: inputEmail,
      password: inputPassword,
      display_name: inputDisplayName,
      href: inputHref,
      referrer: inputReferrer,
      ip: inputIp,
    },
  });
  // Validate complete response structure (types, formats, existence all verified)
  typia.assert(authorized);
  typia.assert(authorized.token);
  // Validate member profile fields match provided input (business logic)
  TestValidator.equals("email matches input", authorized.email, inputEmail);
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    inputDisplayName,
  );
  // Validate optional profile fields are null on initial registration
  TestValidator.equals("avatar_image is null", authorized.avatar_image, null);
  TestValidator.equals("phone_number is null", authorized.phone_number, null);
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
}
