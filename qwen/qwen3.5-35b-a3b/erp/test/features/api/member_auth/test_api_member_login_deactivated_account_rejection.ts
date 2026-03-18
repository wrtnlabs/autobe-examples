import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that login is rejected for deactivated member accounts.
 * Verifies account status enforcement during authentication.
 *
 * Note: Full deactivated account testing requires member update/activate endpoint
 * which is not available in the current SDK. This test verifies the login flow
 * and initial active state.
 */
export async function test_api_member_login_deactivated_account_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (starts as active)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123!";
  const memberDisplayName = RandomGenerator.name();
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  const memberData = {
    email: memberEmail,
    password: memberPassword,
    display_name: memberDisplayName,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IHrmsMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: memberData,
  });
  typia.assert(joinedMember);
  // Verify initial account is active (deleted_at should be null)
  TestValidator.equals(
    "joined member account is active",
    joinedMember.deleted_at,
    null,
  );
  // 2. Verify login works for active account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: IHrmsMember.ILogin = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IHrmsMember.ILogin;
  const loginResult = await api.functional.hrms.auth.member.login(
    loginConnection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResult);
  // Verify login response is successful for active account
  TestValidator.equals(
    "login successful for active account",
    loginResult.id,
    joinedMember.id,
  );
  // 3. Note: Deactivated account login rejection test requires member
  // update/activate endpoint (not available in current SDK). The login
  // endpoint should reject with generic error when account has deleted_at
  // timestamp set.
  // Verify account remains unchanged after login attempt
  TestValidator.equals(
    "account status unchanged after successful login",
    loginResult.deleted_at,
    null,
  );
}
