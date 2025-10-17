import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Member registration success flow.
 *
 * Validates that a new Member can successfully join with credentials and
 * profile basics, receiving authorization tokens and (optionally) a member
 * subject snapshot reflecting initial flags and preferences.
 *
 * Steps:
 *
 * 1. Build a valid IEconDiscussMember.ICreate body with unique email, strong
 *    password, display_name and optional timezone/locale/avatar_uri.
 * 2. Call POST /auth/member/join.
 * 3. Assert response structure with typia.assert (tokens, ids, timestamps).
 * 4. If subject snapshot exists, assert business values:
 *
 *    - Subject.id equals authorized id
 *    - DisplayName equals requested display_name
 *    - Timezone/locale echo requested values
 *    - EmailVerified=false and mfaEnabled=false
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare request body
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayNameInput = RandomGenerator.name(1);
  const timezonePref = "Asia/Seoul";
  const localePref = "en-US";

  const joinBody = {
    email,
    password,
    display_name: displayNameInput,
    timezone: timezonePref,
    locale: localePref,
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  // 2) Register member
  const output = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });

  // 3) Structural and format validation (uuid/date-time) via typia.assert
  typia.assert(output);

  // 4) Business assertions when subject snapshot is provided
  if (output.member !== undefined) {
    TestValidator.equals(
      "subject id equals authorized id",
      output.member.id,
      output.id,
    );
    TestValidator.equals(
      "subject displayName echoes input display_name",
      output.member.displayName,
      displayNameInput,
    );
    TestValidator.equals(
      "subject timezone echoes requested preference",
      output.member.timezone,
      timezonePref,
    );
    TestValidator.equals(
      "subject locale echoes requested preference",
      output.member.locale,
      localePref,
    );
    TestValidator.equals(
      "initial emailVerified should be false",
      output.member.emailVerified,
      false,
    );
    TestValidator.equals(
      "initial mfaEnabled should be false",
      output.member.mfaEnabled,
      false,
    );
  }
}
