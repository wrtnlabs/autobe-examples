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

export async function test_api_member_profile_after_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // Capture original display_name for validation
  const originalDisplayName = authResult.display_name;
  // 2. Update member's display_name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Retrieve the updated profile
  const retrievedProfile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(retrievedProfile);
  // 4. Validate that display_name was actually changed
  TestValidator.notEquals(
    "display_name changed from original",
    retrievedProfile.display_name,
    originalDisplayName,
  );
  // 5. Validate that display_name matches the new value
  TestValidator.equals(
    "display_name matches update",
    retrievedProfile.display_name,
    newDisplayName,
  );
  // 6. Validate that updated_at is later than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(retrievedProfile.updated_at).getTime() >
      new Date(retrievedProfile.created_at).getTime(),
  );
  // 7. Validate that updated_at matches the update response
  TestValidator.equals(
    "updated_at consistent",
    retrievedProfile.updated_at,
    updatedProfile.updated_at,
  );
}
