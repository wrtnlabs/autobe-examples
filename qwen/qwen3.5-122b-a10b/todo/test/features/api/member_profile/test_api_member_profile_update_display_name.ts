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
 * Test member profile display name update functionality.
 *
 * This test verifies the complete workflow of updating a member's display name:
 * 1. Register a new member account
 * 2. Update the display name through the profile endpoint
 * 3. Validate the response contains the updated display name
 * 4. Verify the updated_at timestamp was refreshed
 */
export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name(2);
  const joinOutput: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: initialDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Update the display name
  const updateConnection: api.IConnection = { host: connection.host };
  // Copy authorization header from join output
  updateConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  const newDisplayName = RandomGenerator.name(3);
  const updatedProfile: ITodoAppMember =
    await api.functional.todoApp.member.profile.update(updateConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // 3. Validate the response
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals("member ID preserved", updatedProfile.id, joinOutput.id);
  TestValidator.equals(
    "email preserved",
    updatedProfile.email,
    joinOutput.email,
  );
  // 4. Verify updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedProfile.updatedAt,
    joinOutput.updatedAt,
  );
}
