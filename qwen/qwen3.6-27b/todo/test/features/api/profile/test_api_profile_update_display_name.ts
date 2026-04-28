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

export async function test_api_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register member with null display name
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: null,
    },
  });
  typia.assert(memberAuthorized);
  // Store original member data
  const originalUpdatedAt = memberAuthorized.updated_at;
  // 3. Update the profile with a new display name
  const newDisplayName = RandomGenerator.name();
  const updatedMember = await api.functional.todoApp.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 4. Validate the response
  TestValidator.equals(
    "display name updated",
    updatedMember.display_name,
    newDisplayName,
  );
  TestValidator.equals("id unchanged", updatedMember.id, memberAuthorized.id);
  TestValidator.equals(
    "email unchanged",
    updatedMember.email,
    memberAuthorized.email,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.created_at,
    memberAuthorized.created_at,
  );
  TestValidator.predicate(
    "updated_at is different after update",
    updatedMember.updated_at !== originalUpdatedAt,
  );
}
