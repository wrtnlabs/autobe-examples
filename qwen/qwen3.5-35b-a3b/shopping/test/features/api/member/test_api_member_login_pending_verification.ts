import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that member login succeeds even when email verification status is pending.
 *
 * Validates that account registration grants immediate login access without requiring email verification completion.
 * Ensures that pending email verification status does not block authentication, allowing users to log in immediately
 * after registration while email verification can be completed asynchronously.
 *
 * This test validates the business rule that account activation for login purposes is independent of email
 * verification completion, enabling users to access their accounts immediately while email verification is
 * processed in the background.
 *
 * 1. Register a new member account with email and password (email verification status set to 'pending').
 * 2. Login using the same credentials immediately after registration.
 * 3. Verify successful authentication with valid IAuthorized response.
 * 4. Validate that access and refresh tokens are generated correctly.
 * 5. Confirm pending email verification does not prevent authentication.
 */
export async function test_api_member_login_pending_verification(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register new member account (email verification will be pending)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with same credentials (email verification still pending)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate login succeeded and returned complete IAuthorized structure
  TestValidator.equals(
    "login successful user ID",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "login email matches registration",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "display name preserved",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "phone number preserved",
    loginResult.phone_number,
    joinResult.phone_number,
  );
  TestValidator.equals(
    "created_at preserved",
    loginResult.created_at,
    joinResult.created_at,
  );
}
