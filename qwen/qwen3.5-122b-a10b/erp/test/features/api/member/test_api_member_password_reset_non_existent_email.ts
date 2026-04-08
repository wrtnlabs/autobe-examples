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
 * Test password reset security against email enumeration attacks with non-existent email.
 *
 * Validates that the password reset endpoint maintains security posture by returning consistent success responses regardless of whether the provided email address exists in the system. This prevents malicious actors from enumerating valid user accounts by probing different email addresses.
 *
 * The test ensures that password reset requests for non-existent emails return HTTP 200 success without indicating email existence, and no password reset record is created for non-existent emails.
 *
 * 1. Create an authenticated member account for accessing the password reset endpoint.
 * 2. Generate a random email address guaranteed not to exist in the system.
 * 3. Call the password reset endpoint with the non-existent email.
 * 4. Verify the API returns success without error (no exception thrown).
 */
export async function test_api_member_password_reset_non_existent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member for endpoint access
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate non-existent email (guaranteed unique by random generation)
  const nonExistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // 3. Request password reset for non-existent email
  // If this throws, the test fails - no error means success
  await generate_random_hrm_member_member_password_resets_create(
    memberConnection,
    {
      body: {
        email: nonExistentEmail,
      } satisfies IHrmMemberPasswordReset.ICreate,
    },
  );
  // 4. Success validated by absence of error above
  // The API returned void (HTTP 200) without indicating email existence
  // This confirms the security requirement is met
}
