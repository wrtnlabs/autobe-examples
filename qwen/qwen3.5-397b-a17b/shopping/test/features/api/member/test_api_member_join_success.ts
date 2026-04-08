import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful customer member registration with unique email and password.
 *
 * Validates the complete member registration flow including account creation with unique credentials, JWT token generation, session establishment, and response structure validation. Ensures that the system creates a new member account with 'active' status and returns all required authentication tokens for immediate API access.
 *
 * Special attention is given to verifying that the authorization token contains valid access and refresh tokens with proper expiration timestamps, and that the member account status allows immediate authenticated operations.
 *
 * 1. Generate unique registration credentials with random email, password, and session context.
 * 2. Call authorize_member_join utility function to register new member account.
 * 3. Validate response structure using typia.assert() for complete type validation.
 * 4. Verify member account status is 'active' for immediate access.
 * 5. Confirm member email matches the registration input.
 * 6. Verify administrator field is null for regular members and deleted_at is null for active accounts.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinInput = {
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.IJoin;
  // 2. Register new member account using utility function
  const authorized = await authorize_member_join(connection, {
    body: joinInput,
  });
  // 3. Validate complete response structure with typia
  typia.assert(authorized);
  // 4. Verify member account status is 'active' for immediate access
  TestValidator.equals("member status is active", authorized.status, "active");
  // 5. Confirm email matches registration input
  TestValidator.equals("email matches input", authorized.email, email);
  // 6. Verify administrator is null for regular member
  TestValidator.equals("administrator is null", authorized.administrator, null);
  // 7. Verify deleted_at is null for new active account
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
}
