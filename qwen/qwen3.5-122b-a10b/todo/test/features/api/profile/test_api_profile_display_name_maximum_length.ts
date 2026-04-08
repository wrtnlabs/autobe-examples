import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile display name maximum length validation.
 *
 * Validates that an authenticated member can successfully update their display name to the maximum allowed length of 100 characters. This test ensures the system properly accepts display names at the upper boundary of the length constraint.
 *
 * The test follows the complete authentication and profile update workflow: member registration, authentication, and profile modification with a 100-character display name.
 *
 * 1. Create member-specific connection and register new account.
 * 2. Generate display name with exactly 100 characters.
 * 3. Update profile with the maximum-length display name.
 * 4. Validates response contains correct display name and length.
 */
export async function test_api_profile_display_name_maximum_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Prepare display name with exactly 100 characters
  const maxLengthDisplayName: string = RandomGenerator.alphabets(100);
  // 3. Update profile with maximum-length display name
  const profileUpdate: ITodoAppMember =
    await api.functional.todoApp.member.profile.update(memberConnection, {
      body: {
        displayName: maxLengthDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(profileUpdate);
  // 4. Validate the display name length and value
  TestValidator.equals(
    "display name length is 100",
    profileUpdate.display_name.length,
    100,
  );
  TestValidator.equals(
    "display name matches input",
    profileUpdate.display_name,
    maxLengthDisplayName,
  );
}
