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

export async function test_api_profile_clear_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member with a display name
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: "VisibleName",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals(
    "initial display name",
    joined.display_name,
    "VisibleName",
  );
  // 2. Clear the display name by setting display_name to null
  const beforeUpdate = new Date().toISOString();
  const profile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: null,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 3. Validate the update response
  TestValidator.equals("displayName cleared", profile.displayName, null);
  TestValidator.equals(
    "member displayName cleared",
    profile.member.displayName,
    null,
  );
  TestValidator.predicate(
    "updatedAt advanced",
    profile.updatedAt > beforeUpdate,
  );
}
