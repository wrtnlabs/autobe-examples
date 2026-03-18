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

export async function test_api_member_profile_own_profile_only(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  const member1JoinBody = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: typia.assert<boolean>(RandomGenerator.alphaNumeric(12)),
  } satisfies ITodoAppMember.IJoin;
  const member2JoinBody = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: typia.assert<boolean>(RandomGenerator.alphaNumeric(12)),
  } satisfies ITodoAppMember.IJoin;
  const member1Authorized = await api.functional.todoApp.auth.member.join(
    member1Connection,
    {
      body: member1JoinBody,
    },
  );
  typia.assert(member1Authorized);
  const member2Authorized = await api.functional.todoApp.auth.member.join(
    member2Connection,
    {
      body: member2JoinBody,
    },
  );
  typia.assert(member2Authorized);
  const member1DisplayName = RandomGenerator.name();
  const member1Profile = await api.functional.todoApp.member.profile.update(
    member1Connection,
    {
      body: {
        display_name: member1DisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(member1Profile);
  const member2DisplayName = RandomGenerator.name();
  const member2Profile = await api.functional.todoApp.member.profile.update(
    member2Connection,
    {
      body: {
        display_name: member2DisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(member2Profile);
  TestValidator.equals(
    "member 1 profile should update only its own display name",
    member1Profile.displayName,
    member1DisplayName,
  );
  TestValidator.equals(
    "member 2 profile should update only its own display name",
    member2Profile.displayName,
    member2DisplayName,
  );
  TestValidator.equals(
    "member 1 profile should stay tied to member 1 account",
    member1Profile.todoAppMember.email,
    member1Authorized.email,
  );
  TestValidator.equals(
    "member 2 profile should stay tied to member 2 account",
    member2Profile.todoAppMember.email,
    member2Authorized.email,
  );
  TestValidator.notEquals(
    "member profiles must remain isolated across accounts",
    member1Profile.todoAppMember.id,
    member2Profile.todoAppMember.id,
  );
  TestValidator.notEquals(
    "member 1 update must not leak into member 2 profile",
    member1Profile.displayName,
    member2Profile.displayName,
  );
}
