import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success_rotates_tokens(
  connection: api.IConnection,
): Promise<void> {
  const testStart = new Date();
  // 1) Join a member and obtain initial tokens
  const memberConnection1: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(firstAuth);
  // 2) Refresh once (rotate tokens)
  const memberConnection2: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_member_refresh(memberConnection2, {
    body: {
      refreshToken: firstAuth.token.refresh,
    },
  });
  typia.assert(firstRefresh);
  TestValidator.equals(
    "member id should remain consistent after refresh",
    firstRefresh.id,
    firstAuth.id,
  );
  TestValidator.notEquals(
    "access token should rotate after refresh",
    firstRefresh.token.access,
    firstAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate after refresh",
    firstRefresh.token.refresh,
    firstAuth.token.refresh,
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(firstRefresh.token.expired_at).getTime() > testStart.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until should be on/after expired_at",
    new Date(firstRefresh.token.refreshable_until).getTime() >=
      new Date(firstRefresh.token.expired_at).getTime(),
  );
  // 3) Refresh again using the rotated refresh token
  const memberConnection3: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_member_refresh(memberConnection3, {
    body: {
      refreshToken: firstRefresh.token.refresh,
    },
  });
  typia.assert(secondRefresh);
  TestValidator.equals(
    "member id should remain consistent after second refresh",
    secondRefresh.id,
    firstAuth.id,
  );
  TestValidator.notEquals(
    "access token should rotate again",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate again",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );
  TestValidator.predicate(
    "second expired_at should be in the future",
    new Date(secondRefresh.token.expired_at).getTime() > testStart.getTime(),
  );
  TestValidator.predicate(
    "second refreshable_until should be on/after expired_at",
    new Date(secondRefresh.token.refreshable_until).getTime() >=
      new Date(secondRefresh.token.expired_at).getTime(),
  );
}
