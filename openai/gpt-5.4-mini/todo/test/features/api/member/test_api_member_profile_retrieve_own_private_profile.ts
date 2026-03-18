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

export async function test_api_member_profile_retrieve_own_private_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const password = true;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  const repeatedProfile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(repeatedProfile);
  TestValidator.equals(
    "profile owner id matches signed-in member",
    profile.todoAppMember.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile owner email matches signed-in member",
    profile.todoAppMember.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile id is stable for repeated retrieval",
    profile.id,
    repeatedProfile.id,
  );
  TestValidator.equals(
    "profile display name is stable for repeated retrieval",
    profile.displayName,
    repeatedProfile.displayName,
  );
  TestValidator.equals(
    "profile createdAt is stable for repeated retrieval",
    profile.createdAt,
    repeatedProfile.createdAt,
  );
  TestValidator.equals(
    "profile updatedAt is stable for repeated retrieval",
    profile.updatedAt,
    repeatedProfile.updatedAt,
  );
  TestValidator.equals(
    "profile deletedAt is stable for repeated retrieval",
    profile.deletedAt,
    repeatedProfile.deletedAt,
  );
  TestValidator.predicate(
    "profile is tied to the authenticated member",
    profile.todoAppMember.id === authorized.id &&
      profile.todoAppMember.email === authorized.email,
  );
  TestValidator.predicate(
    "profile does not expose credentials",
    !Object.prototype.hasOwnProperty.call(profile.todoAppMember, "password") &&
      !Object.prototype.hasOwnProperty.call(profile.todoAppMember, "token"),
  );
  TestValidator.predicate("profile is active", profile.deletedAt === null);
}
