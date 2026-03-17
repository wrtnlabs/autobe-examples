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

export async function test_api_member_profile_update_minimal_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create member account using utility function
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  // Authorization token is now in memberConnection.headers via utility function
  // No need to manually set Authorization header
  // 2. Update profile with minimal display name (single character)
  const updateResponse = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "A",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updateResponse);
  // 3. Validate update succeeded
  TestValidator.equals(
    "display name should be updated to single character",
    updateResponse.display_name,
    "A",
  );
  TestValidator.notEquals(
    "display name should change from original",
    updateResponse.display_name,
    memberAuthorized.display_name,
  );
  TestValidator.predicate(
    "member ID should remain unchanged",
    updateResponse.id === memberAuthorized.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updateResponse.email,
    memberAuthorized.email,
  );
}
