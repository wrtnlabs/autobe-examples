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

export async function test_api_profile_update_reflects_across_system(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member with authorize_member_join utility function
  const initialDisplayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // Verify initial display name
  TestValidator.equals(
    "initial display name matches",
    authorized.display_name,
    initialDisplayName,
  );
  // 2. Update display name
  const updatedDisplayName = RandomGenerator.name();
  const updateResponse =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {
        displayName: updatedDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updateResponse);
  // 3. Verify updated display name in response
  TestValidator.equals(
    "display name updated successfully",
    updateResponse.display_name,
    updatedDisplayName,
  );
  // 4. Verify consistency: updated display name should not equal initial
  TestValidator.notEquals(
    "display name changed",
    updateResponse.display_name,
    initialDisplayName,
  );
  // 5. Verify timestamps show update occurred
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updateResponse.updated_at) >= new Date(updateResponse.created_at),
  );
  // 6. Additional validation: profile update response should have same ID
  TestValidator.equals(
    "member ID unchanged after profile update",
    updateResponse.id,
    authorized.id,
  );
}
