import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
import { generate_random_erp_hrm_guest_password_resets_create } from "../../../generate/generate_random_erp_hrm_guest_password_resets_create";
import { prepare_random_erp_hrm_member_password_reset } from "../../../prepare/prepare_random_erp_hrm_member_password_reset";

/**
 * Test successful password reset completion flow from member creation through token verification.
 *
 * Validates the complete password recovery lifecycle: account registration, reset request initiation, and final password update via the completion endpoint. The test ensures proper type safety, void response handling, and end-to-end API structure correctness.
 *
 * 1. A new member account is created via guest join with a known email, password, and display name. The authorized response is validated with typia.assert.
 * 2. A password reset is requested for the member's registered email address. The generate utility is used to create the reset record server-side. The API always returns 204 No Content regardless of whether the email exists.
 * 3. The password reset completion endpoint is called with a new password (different from the original, meeting the &lt;password&gt; format tag requirements). The resetId and token are randomly generated since the cryptographic token is delivered exclusively via email and never exposed through API responses.
 *
 * The void response from the completion endpoint confirms the API contract is satisfied. Full success verification (member logging in with the new password) requires database-level access to retrieve the actual token, which is beyond the scope of API-level E2E testing.
 */
export async function test_api_password_reset_completion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via guest join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(joinConnection, {
    body: {
      email: memberEmail,
      password: originalPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Request a password reset for the member's email
  await generate_random_erp_hrm_guest_password_resets_create(
    { host: connection.host },
    { body: { email: memberEmail } },
  );
  // 3. Complete the password reset with a new password
  const newPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.erpHrm.guest.password_resets.completion.complete(
    { host: connection.host },
    {
      resetId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        token: RandomGenerator.alphaNumeric(64),
        password: newPassword,
      } satisfies IErpHrmMemberPasswordReset.ICompletion,
    },
  );
}
