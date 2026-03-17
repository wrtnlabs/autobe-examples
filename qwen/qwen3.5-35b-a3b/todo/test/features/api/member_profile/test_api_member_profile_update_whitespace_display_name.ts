import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_whitespace_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoAppMember.IJoin;
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const originalDisplayName = joinResult.displayName;
  // 2. Create authenticated connection for profile updates
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 3. Test multiple whitespace-only display names
  const whitespaceOnlyNames = ["   ", "\t\n", "  \t  ", "\r\n", "   \t   "];
  for (const whitespaceName of whitespaceOnlyNames) {
    // Attempt to update with whitespace-only name - should fail
    await TestValidator.error(
      `reject whitespace-only display name: "${whitespaceName}"`,
      async () => {
        await api.functional.multiUserTodoApp.member.profile.update(
          profileConnection,
          {
            body: {
              displayName: whitespaceName,
            } satisfies IMultiUserTodoAppMember.IUpdate,
          },
        );
      },
    );
  }
  // 4. Verify original display name remains unchanged after rejected updates
  TestValidator.equals(
    "display name unchanged after rejected updates",
    joinResult.displayName,
    originalDisplayName,
  );
}
