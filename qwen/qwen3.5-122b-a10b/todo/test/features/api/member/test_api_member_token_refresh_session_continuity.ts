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

export async function test_api_member_token_refresh_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial identity claims
  const initialId = initialAuth.id;
  const initialEmail = initialAuth.email;
  const initialName = initialAuth.name;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Perform multiple refresh operations to test token rotation
  const REFRESH_COUNT = 3;
  const refreshResults: IMultiUserTodoMember.IAuthorized[] = [];
  await ArrayUtil.asyncRepeat(REFRESH_COUNT, async (index) => {
    // Use current refresh token to get new tokens
    const currentToken =
      index === 0
        ? initialRefreshToken
        : refreshResults[index - 1].token.refresh;
    const refreshAuth = await authorize_member_refresh(memberConnection, {
      body: {
        refresh_token: currentToken,
      } satisfies IMultiUserTodoMember.IRefresh,
    });
    typia.assert(refreshAuth);
    refreshResults.push(refreshAuth);
    // 3. Validate member identity remains consistent across all refreshes
    TestValidator.equals(
      `identity id (refresh ${index + 1})`,
      refreshAuth.id,
      initialId,
    );
    TestValidator.equals(
      `identity email (refresh ${index + 1})`,
      refreshAuth.email,
      initialEmail,
    );
    TestValidator.equals(
      `identity name (refresh ${index + 1})`,
      refreshAuth.name,
      initialName,
    );
    // 4. Validate new access token is generated (different from previous)
    if (index > 0) {
      TestValidator.notEquals(
        `access token changed (refresh ${index + 1})`,
        refreshAuth.token.access,
        refreshResults[index - 1].token.access,
      );
    }
    // 5. Validate token rotation - new refresh token generated
    TestValidator.notEquals(
      `refresh token rotated (refresh ${index + 1})`,
      refreshAuth.token.refresh,
      currentToken,
    );
    // 6. Validate access token expiration extends
    TestValidator.predicate(
      `access token expired_at extends (refresh ${index + 1})`,
      new Date(refreshAuth.token.expired_at).getTime() >
        new Date(initialExpiredAt).getTime(),
    );
    // 7. Validate refreshable_until may extend (session lifetime)
    TestValidator.predicate(
      `refreshable_until extends or maintains (refresh ${index + 1})`,
      new Date(refreshAuth.token.refreshable_until).getTime() >=
        new Date(initialRefreshableUntil).getTime(),
    );
  });
  // 8. Validate old refresh token becomes invalid after rotation
  // Try to use the initial refresh token again - should fail
  await TestValidator.error(
    "old refresh token invalid after rotation",
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
  // 9. Validate final state
  const finalAuth = refreshResults[refreshResults.length - 1];
  TestValidator.equals(
    "final member id matches initial",
    finalAuth.id,
    initialId,
  );
  TestValidator.equals(
    "final member email matches initial",
    finalAuth.email,
    initialEmail,
  );
  TestValidator.equals(
    "final member name matches initial",
    finalAuth.name,
    initialName,
  );
  TestValidator.predicate(
    "final access token valid",
    finalAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "final refresh token valid",
    finalAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "final expired_at is future",
    new Date(finalAuth.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "final refreshable_until is future",
    new Date(finalAuth.token.refreshable_until).getTime() > Date.now(),
  );
}
