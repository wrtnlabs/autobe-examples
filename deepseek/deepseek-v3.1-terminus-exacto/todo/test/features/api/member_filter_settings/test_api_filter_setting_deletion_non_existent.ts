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
 * Test attempting to delete a non-existent filter setting.
 * Create a member account, then attempt to delete a filter setting with a random UUID
 * that doesn't exist in the system. Verify the operation returns 404 Not Found error.
 */
export async function test_api_filter_setting_deletion_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Use authorize_member_join utility function (REQUIRED - not SDK)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Generate random UUID that doesn't exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent filter setting
  await TestValidator.httpError(
    "delete non-existent filter setting returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.erase(
        memberConnection,
        {
          filterSettingId: nonExistentId,
        },
      );
    },
  );
}
