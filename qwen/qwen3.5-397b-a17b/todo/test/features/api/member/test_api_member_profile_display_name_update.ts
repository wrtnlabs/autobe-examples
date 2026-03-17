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

export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with initial display name
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalDisplayName = joinResult.display_name;
  const originalCreatedAt = joinResult.created_at;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Update the display name to a new value
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
  // 3. Verify the response contains the updated display name
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 4. Verify the updated_at timestamp has changed from original
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 5. Verify the profile structure and other fields remain consistent
  TestValidator.equals("id matches", updatedProfile.id, joinResult.id);
  TestValidator.equals("email matches", updatedProfile.email, joinResult.email);
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedProfile.deleted_at === null,
  );
  TestValidator.notEquals(
    "display name differs from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
}
