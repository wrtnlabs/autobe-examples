import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = true;
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const expectedDisplayName = RandomGenerator.name();
  const updated = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: expectedDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "profile display name should be updated",
    updated.displayName,
    expectedDisplayName,
  );
  TestValidator.equals(
    "updated profile should belong to the signed-in member",
    updated.todoAppMember.id,
    joined.id,
  );
  TestValidator.equals(
    "updated profile should preserve the signed-in member email",
    updated.todoAppMember.email,
    joined.email,
  );
  TestValidator.equals(
    "updated profile should remain active",
    updated.todoAppMember.deleted_at,
    null,
  );
  TestValidator.equals(
    "updated profile should remain active",
    updated.deletedAt,
    null,
  );
}
