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

export async function test_api_profile_update_display_name_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Store initial member details from join response
  const initialDisplayName = joinResponse.display_name;
  const memberId = joinResponse.id;
  const memberEmail = joinResponse.email;
  const createdAt = joinResponse.created_at;
  const initialUpdatedAt = joinResponse.updated_at;
  // 3. Generate new display name different from original
  let newDisplayName: string;
  do {
    newDisplayName = RandomGenerator.name();
  } while (newDisplayName === initialDisplayName);
  // 4. Update profile with new display name
  const updateResponse =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {
        displayName: newDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updateResponse);
  // 5. Validate updated display name matches input
  TestValidator.equals(
    "display name should be updated",
    updateResponse.display_name,
    newDisplayName,
  );
  // 6. Verify updated_at timestamp is refreshed
  const updatedAt = new Date(updateResponse.updated_at).getTime();
  const createdTime = new Date(createdAt).getTime();
  const initialUpdatedTime = new Date(initialUpdatedAt).getTime();
  TestValidator.predicate(
    "updated_at should be equal to or later than created_at",
    updatedAt >= createdTime,
  );
  TestValidator.predicate(
    "updated_at should be later than initial updated_at after update",
    updatedAt > initialUpdatedTime,
  );
  // 7. Ensure other profile fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updateResponse.id,
    memberId,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updateResponse.email,
    memberEmail,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updateResponse.created_at,
    createdAt,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updateResponse.deleted_at,
    null,
  );
}
