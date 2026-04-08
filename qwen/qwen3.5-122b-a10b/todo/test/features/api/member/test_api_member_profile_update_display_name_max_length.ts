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
 * Test member profile update with display name at maximum length constraint.
 *
 * Validates that a logged-in member can successfully update their display name to the maximum allowed length of 100 characters. This boundary value test ensures the system correctly handles the upper limit of the display name length constraint without data loss or truncation.
 *
 * The test follows the complete authentication and profile update workflow:
 *
 * 1. Register a new member account with random credentials using authorize_member_join utility
 * 2. Create a member-specific connection for authenticated profile update requests
 * 3. Generate a display name with exactly 100 characters (maximum allowed length)
 * 4. Update the member profile with the maximum-length display name
 * 5. Verify the response contains the full 100-character display name without truncation
 * 6. Confirm the display_name field matches the input exactly using TestValidator
 *
 * This test validates both the functional correctness of the profile update endpoint and the proper enforcement of the display name length constraint at its upper boundary.
 */
export async function test_api_member_profile_update_display_name_max_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 3. Generate display name with exactly 100 characters (maximum allowed)
  const maxDisplayName: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.alphabets(100) as string &
      tags.MinLength<1> &
      tags.MaxLength<100>;
  // 4. Update member profile with maximum-length display name
  const updated: ITodoAppMember = await api.functional.todoApp.members.update(
    memberConnection,
    {
      body: {
        displayName: maxDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Verify the display name is exactly 100 characters without truncation
  TestValidator.equals("display name length", updated.display_name.length, 100);
  TestValidator.equals(
    "display name matches input",
    updated.display_name,
    maxDisplayName,
  );
}
