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

export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Store original values for comparison
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 3. Generate a new display name
  const newDisplayName = RandomGenerator.name();
  // 4. Update display name via profile endpoint
  const updated = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate display_name is updated
  TestValidator.equals(
    "display_name updated correctly",
    updated.display_name,
    newDisplayName,
  );
  // 6. Validate id remains unchanged
  TestValidator.equals("id unchanged", updated.id, originalId);
  // 7. Validate email remains unchanged
  TestValidator.equals("email unchanged", updated.email, originalEmail);
  // 8. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCreatedAt,
  );
  // 9. Validate updated_at is refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    updated.updated_at > originalUpdatedAt,
  );
}
