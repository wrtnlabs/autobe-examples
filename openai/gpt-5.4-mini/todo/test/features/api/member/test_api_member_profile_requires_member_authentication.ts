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

export async function test_api_member_profile_requires_member_authentication(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.error(
    "member profile requires authentication",
    async () => {
      await api.functional.todoApp.member.profile.at(connection);
    },
  );
  const authorized = await api.functional.todoApp.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile owner email matches authenticated member",
    profile.todoAppMember.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile owner id matches authenticated member",
    profile.todoAppMember.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile owner deleted_at matches authenticated member",
    profile.todoAppMember.deleted_at,
    authorized.deleted_at,
  );
}
