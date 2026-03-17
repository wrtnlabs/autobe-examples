import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate registration data with session tracking metadata
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href,
      referrer,
      ip,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Validate authorization response
  typia.assert(authorized);
  // Verify member identity information
  TestValidator.predicate("name is present", authorized.name.length > 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    authorized.deleted_at === null,
  );
  // Verify authorization token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    Date.parse(authorized.token.expired_at) <=
      Date.parse(authorized.token.refreshable_until),
  );
}
