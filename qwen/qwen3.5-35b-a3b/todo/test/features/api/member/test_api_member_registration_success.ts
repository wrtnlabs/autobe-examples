import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using authorization utility
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(joinedMember);
  // 2. Verify member profile data
  TestValidator.predicate(
    "member has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinedMember.id,
    ),
  );
  TestValidator.predicate(
    "member has non-empty display name",
    joinedMember.displayName.trim().length > 0,
  );
  TestValidator.predicate(
    "member has valid createdAt timestamp",
    !isNaN(new Date(joinedMember.createdAt).getTime()),
  );
  TestValidator.predicate(
    "member has valid updatedAt timestamp",
    !isNaN(new Date(joinedMember.updatedAt).getTime()),
  );
  // 3. Verify authorization tokens structure
  TestValidator.predicate(
    "token has valid access token",
    joinedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has valid refresh token",
    joinedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration time",
    !isNaN(new Date(joinedMember.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "token has refreshable until time",
    !isNaN(new Date(joinedMember.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "refreshable until is after expired at",
    new Date(joinedMember.token.refreshable_until).getTime() >
      new Date(joinedMember.token.expired_at).getTime(),
  );
  // 4. Test that access token can be used for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joinedMember.token.access}` },
  };
  // 5. Verify tokens have appropriate expiration times
  const now = Date.now();
  const accessTokenExpiry = new Date(joinedMember.token.expired_at).getTime();
  const refreshTokenExpiry = new Date(
    joinedMember.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "access token expires in the future",
    accessTokenExpiry > now,
  );
  TestValidator.predicate(
    "refresh token expires in the future",
    refreshTokenExpiry > now,
  );
}
