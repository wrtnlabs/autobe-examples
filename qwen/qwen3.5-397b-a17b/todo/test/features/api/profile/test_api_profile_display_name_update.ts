import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // Store original timestamp for comparison
  const originalTimestamp = new Date().toISOString();
  // 2. Update profile with new display name
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const updatedProfile =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 3. Validate the display name was updated correctly
  TestValidator.equals(
    "display name matches input",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 4. Validate profile structure
  TestValidator.equals(
    "profile id matches auth id",
    updatedProfile.id,
    auth.id,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    () => !isNaN(Date.parse(updatedProfile.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    () => !isNaN(Date.parse(updatedProfile.updatedAt)),
  );
  TestValidator.equals(
    "deletedAt is null for active profile",
    updatedProfile.deletedAt,
    null,
  );
  // 5. Validate updatedAt is after original timestamp (proves update occurred)
  TestValidator.predicate("updatedAt reflects recent change", () => {
    const updatedAt = new Date(updatedProfile.updatedAt);
    const original = new Date(originalTimestamp);
    return updatedAt >= original;
  });
}
