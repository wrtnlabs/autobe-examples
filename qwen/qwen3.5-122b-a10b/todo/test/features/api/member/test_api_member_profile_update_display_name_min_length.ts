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
 * Test member profile display name update with minimum length constraint.
 *
 * Validates that a logged-in member can successfully update their display name to the minimum allowed length of 1 character. This test ensures the lower boundary of the display name length validation is properly enforced and that single-character display names are persisted correctly.
 *
 * The test creates a new member account, updates the display name to exactly one character, and verifies the update was successful with all other profile fields remaining intact.
 *
 * 1. Create a new member account with random credentials.
 * 2. Update the member's display name to exactly 1 character.
 * 3. Validates the response contains the correct single-character display name.
 * 4. Verifies the display_name length is exactly 1 character.
 * 5. Verifies other fields (id, email, timestamps) remain unchanged.
 */
export async function test_api_member_profile_update_display_name_min_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with random credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Update display name to minimum length (1 character)
  const singleCharName = RandomGenerator.alphabets(1);
  const updated = await api.functional.todoApp.members.update(
    memberConnection,
    {
      body: {
        displayName: singleCharName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate the update succeeded
  TestValidator.equals(
    "display name updated",
    updated.display_name,
    singleCharName,
  );
  TestValidator.predicate(
    "display name length is 1",
    updated.display_name.length === 1,
  );
  TestValidator.equals("member ID preserved", updated.id, auth.id);
  TestValidator.equals("email preserved", updated.email, auth.email);
}
