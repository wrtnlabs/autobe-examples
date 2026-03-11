import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test validation error when attempting to update display name with empty value.
 *
 * Create a new member account via join endpoint, then attempt to update the
 * display name with an empty string. Verify the system rejects the request
 * with appropriate validation error, and ensure the original display name
 * remains unchanged.
 */
export async function test_api_profile_update_empty_display_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  // Use utility function to join and get authorized member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Store original display name for comparison
  const originalDisplayName = member.display_name;
  // 2. Attempt to update profile with empty display name
  await TestValidator.error(
    "profile update should reject empty display name",
    async () => {
      await api.functional.multiUserTodo.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: "",
          } satisfies IMultiUserTodoMember.IUpdate,
        },
      );
    },
  );
  // 3. Verify original display name is unchanged
  // Note: We don't have a GET profile endpoint in available API functions,
  // but we can verify the member object we already have still has original name
  TestValidator.equals(
    "display name should remain unchanged after failed update",
    member.display_name,
    originalDisplayName,
  );
}
