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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection (isolation from base connection)
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 3. Call the join utility function (MANDATORY - utility exists for this endpoint)
  const result = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Full structural validation via typia.assert
  typia.assert(result);
  // 5. Business logic assertions
  // Email must match the submitted email
  TestValidator.equals("email matches submitted value", result.email, email);
  // deleted_at must be null for a newly created active account
  TestValidator.equals(
    "deleted_at is null for active account",
    result.deleted_at,
    null,
  );
  // Profile memberId must match the member id
  TestValidator.equals(
    "profile.memberId matches member id",
    result.profile.memberId,
    result.id,
  );
  // Profile displayName must be a non-empty string
  TestValidator.predicate(
    "profile.displayName is non-empty",
    result.profile.displayName.length > 0,
  );
  // Token access must be non-empty
  TestValidator.predicate(
    "token.access is non-empty",
    result.token.access.length > 0,
  );
  // Token refresh must be non-empty
  TestValidator.predicate(
    "token.refresh is non-empty",
    result.token.refresh.length > 0,
  );
  // token.expired_at must be a future datetime
  const now = new Date();
  TestValidator.predicate(
    "token.expired_at is in the future",
    new Date(result.token.expired_at) > now,
  );
  // token.refreshable_until must be after token.expired_at
  TestValidator.predicate(
    "token.refreshable_until is after expired_at",
    new Date(result.token.refreshable_until) >
      new Date(result.token.expired_at),
  );
}
