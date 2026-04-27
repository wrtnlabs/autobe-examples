import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_set_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with initial display name
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const initialDisplayName = "InitialName";
  const newDisplayName = "MyNewDisplayName";
  const timeBeforeJoin = new Date();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: initialDisplayName,
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Update profile display name
  const profile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 3. Validate profile response
  TestValidator.equals(
    "display name set to new value",
    profile.displayName,
    newDisplayName,
  );
  TestValidator.predicate(
    "updatedAt is after profile creation",
    new Date(profile.updatedAt).getTime() >= timeBeforeJoin.getTime(),
  );
  TestValidator.equals(
    "member id matches authenticated member",
    profile.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches registered email",
    profile.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member displayName reflects updated name",
    profile.member.displayName,
    newDisplayName,
  );
}
