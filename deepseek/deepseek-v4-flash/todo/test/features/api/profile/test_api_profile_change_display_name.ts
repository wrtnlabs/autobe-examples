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

export async function test_api_profile_change_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with initial display name
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "password123!";
  const firstDisplayName = "FirstDisplayName";
  const memberConnection: api.IConnection = { host: connection.host };
  const joined: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password,
        display_name: firstDisplayName,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  TestValidator.equals(
    "initial display name",
    joined.display_name,
    firstDisplayName,
  );
  // 2. Update display name
  const changedDisplayName = "ChangedDisplayName";
  const profile: ITodoAppProfile =
    await api.functional.todoApp.member.profile.update(memberConnection, {
      body: {
        display_name: changedDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    });
  typia.assert(profile);
  // 3. Validate profile response
  TestValidator.equals(
    "displayName changed",
    profile.displayName,
    changedDisplayName,
  );
  TestValidator.equals(
    "member.displayName changed",
    profile.member.displayName,
    changedDisplayName,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(profile.updatedAt).getTime() >
      new Date(profile.createdAt).getTime(),
  );
}
