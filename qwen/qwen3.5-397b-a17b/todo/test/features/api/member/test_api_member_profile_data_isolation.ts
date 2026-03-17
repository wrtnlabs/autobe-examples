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

export async function test_api_member_profile_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authentication session
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
  // 2. Retrieve the authenticated member's profile
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile data matches the joined member information
  TestValidator.equals("member id matches", profile.id, joinResult.id);
  TestValidator.equals("email matches", profile.email, joinResult.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    joinResult.updated_at,
  );
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
}
