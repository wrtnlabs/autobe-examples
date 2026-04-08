import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success_issues_new_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join obtains a valid guest authorization response.
  const guestConnectionForJoin: api.IConnection = { host: connection.host };
  const joinInput = {
    display_name: RandomGenerator.name(),
    password: typia.random<
      string & tags.MinLength<1> & tags.Format<"password">
    >(),
    href: "https://example.com/guest/join",
    referrer: "https://example.com/guest/join?ref=1",
    ip: "127.0.0.1",
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const joined = await authorize_guest_join(guestConnectionForJoin, {
    body: joinInput,
  });
  typia.assert(joined);
  // 2. Guest refresh issues a new token pair using the join refresh credential.
  const guestConnectionForRefresh: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(guestConnectionForRefresh, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IMultiUserTodoUserProfile.IRefresh,
  });
  typia.assert(refreshed);
  // Token pair basics (business logic assertions).
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access expiration should be present and non-empty",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable-until should be present and non-empty",
    refreshed.token.refreshable_until.length > 0,
  );
  // Same guest principal identity as join response.
  TestValidator.equals(
    "principal profile id should be consistent",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "principal user id should be consistent",
    refreshed.multi_user_todo_user_id,
    joined.multi_user_todo_user_id,
  );
  // New tokens should be issued (token rotation).
  TestValidator.notEquals(
    "access token should differ after refresh",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should differ after refresh",
    joined.token.refresh,
    refreshed.token.refresh,
  );
}
