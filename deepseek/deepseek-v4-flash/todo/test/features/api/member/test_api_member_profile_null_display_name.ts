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

export async function test_api_member_profile_null_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account WITHOUT display_name
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Fetch the member profile using the member's own ID
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3. Validate display_name is null (no profile display_name was set)
  TestValidator.equals("display_name is null", profile.display_name, null);
  // 4. Validate other fields are populated correctly
  TestValidator.equals("id matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    authorized.updated_at,
  );
}
