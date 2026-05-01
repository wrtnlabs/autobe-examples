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
 * Verify that initiating a password reset for a registered member email succeeds silently.
 *
 * Validates the email enumeration prevention policy: the password reset endpoint
 * always returns 204 No Content with an empty response body regardless of whether
 * the email exists in the system. This test first creates a member account with a
 * known email address, then requests a password reset for that exact email, and
 * verifies the call completes without error — the SDK returns `void` for 204 No
 * Content, so the absence of an exception constitutes a passing test.
 *
 * 1. Generate a randomized email address to serve as the known registered email.
 * 2. Create a member account via guest join with that email.
 * 3. Request a password reset using the same registered email.
 * 4. Verify the API call completes successfully (void return, no exception thrown).
 */
export async function test_api_password_reset_registered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a known email and register a member account
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_guest_join(connection, {
    body: { email },
  });
  // 2. Request password reset for the registered email
  // 3. The call returns void (204 No Content) — success is verified by no exception
  await generate_random_erp_hrm_guest_password_resets_create(connection, {
    body: { email },
  });
}
