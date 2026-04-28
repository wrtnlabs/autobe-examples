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

export async function test_api_member_join_with_optional_display_name(
  connection: api.IConnection,
) {
  // 1. Setup member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Generate test data with explicit display_name
  const displayName = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  // 3. Join member with all fields including display_name
  const member = await authorize_member_join(memberConnection, {
    body: {
      display_name: displayName,
      email: email,
    },
  });
  // 4. Validate complete response
  typia.assert(member);
  // 5. Verify business logic - display_name was persisted correctly
  await TestValidator.equals(
    "display_name matches",
    member.display_name,
    displayName,
  );
  await TestValidator.equals("email matches", member.email, email);
  // 6. Verify authorization token structure
  await TestValidator.predicate("has access token", !!member.token.access);
  await TestValidator.predicate("has refresh token", !!member.token.refresh);
  await TestValidator.predicate("has token expiration", !!member.token.expired_at);
  await TestValidator.predicate(
    "has refreshable until",
    !!member.token.refreshable_until,
  );
  // 7. Verify timestamps
  await TestValidator.predicate("has created_at timestamp", !!member.created_at);
  await TestValidator.predicate("has updated_at timestamp", !!member.updated_at);
  // 8. Verify account status - newly created account should be active (deleted_at is null)
  await TestValidator.equals("account is active", member.deleted_at, null);
}