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
 * Test that profile update with whitespace-only display name is properly rejected.
 *
 * This validates business logic that display names must contain at least one
 * non-whitespace character, testing validation beyond schema constraints.
 * The DTO type `ITodoAppMember.IUpdate` only requires `MinLength<1>`, so
 * whitespace-only strings are type-valid but should be rejected by business logic.
 */
export async function test_api_member_profile_update_whitespace_only_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Store original display name for comparison
  const originalDisplayName = member.display_name;
  // Test multiple whitespace variations that should all be rejected
  const whitespaceVariations = [
    "   ", // spaces only
    "\t\t\t", // tabs only
    "\n\n\n", // newlines only
    "   \t\n  ", // mixed whitespace
    " \t \n \r ", // all whitespace types
  ];
  for (const whitespaceDisplayName of whitespaceVariations) {
    // This should fail - whitespace-only display names should be rejected by business logic
    await TestValidator.error(
      `profile update with whitespace-only display name should fail: "${whitespaceDisplayName.replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r")}"`,
      async () => {
        await api.functional.todoApp.member.profile.update(memberConnection, {
          body: {
            display_name: whitespaceDisplayName,
          } satisfies ITodoAppMember.IUpdate,
        });
      },
    );
  }
  // Also test that undefined display_name is allowed (no update)
  // This should succeed since display_name is optional
  const noUpdateResult = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {} satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(noUpdateResult);
  // Verify original display name remains unchanged after failed updates
  TestValidator.equals(
    "member object display name unchanged",
    noUpdateResult.display_name,
    originalDisplayName,
  );
}
