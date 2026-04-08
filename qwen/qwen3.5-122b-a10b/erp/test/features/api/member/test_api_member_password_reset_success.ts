import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_password_resets_create } from "../../../generate/generate_random_hrm_member_member_password_resets_create";
import { prepare_random_hrm_member_password_reset } from "../../../prepare/prepare_random_hrm_member_password_reset";

/**
 * Test member password reset request success path.
 *
 * Validates the primary flow for requesting a password reset via email. An authenticated member can request a password reset by providing their registered email address. The system validates the email format, looks up the member account, generates a secure one-time password reset token with 1-hour expiration, creates a password reset record, and sends a password reset email asynchronously.
 *
 * The API response returns HTTP 200 success without exposing the token or indicating whether the email exists in the system to prevent email enumeration attacks.
 *
 * 1. Create a new member account with email and password credentials.
 * 2. Extract the member's email from the registration response.
 * 3. Request password reset by calling the password reset endpoint with the member's email.
 * 4. Verify the API call completes successfully without throwing errors.
 */
export async function test_api_member_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Request password reset with the member's email
  const memberEmail: string = memberAuth.email;
  await generate_random_hrm_member_member_password_resets_create(
    memberConnection,
    {
      body: {
        email: memberEmail,
      } satisfies IHrmMemberPasswordReset.ICreate,
    },
  );
}
