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

export async function test_api_member_profile_missing_owner_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: false,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  try {
    const profile =
      await api.functional.todoApp.member.profile.at(memberConnection);
    typia.assert(profile);
    TestValidator.equals(
      "profile owner should match the signed-in member",
      profile.todoAppMember.id,
      member.id,
    );
    TestValidator.equals(
      "profile owner email should match the signed-in member",
      profile.todoAppMember.email,
      member.email,
    );
  } catch (exp) {
    const error = exp as { status?: unknown };
    TestValidator.predicate(
      "profile access failure should be safely handled",
      typeof error.status === "number" && error.status >= 400 && error.status < 500,
    );
  }
}
