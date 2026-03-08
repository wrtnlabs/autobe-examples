import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register/authenticate via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(initialAuth);
  // 2. Store initial tokens
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Create new connection for refresh (isolated from initial connection)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Validate token rotation - new tokens differ from originals
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original (token rotation)",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 5. Validate member profile is complete
  TestValidator.equals("member id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("email matches", refreshedAuth.email, initialAuth.email);
  TestValidator.equals(
    "displayName matches",
    refreshedAuth.displayName,
    initialAuth.displayName,
  );
  // 6. Validate member is active
  TestValidator.equals("member is not banned", refreshedAuth.banned, false);
  TestValidator.equals("member is not deleted", refreshedAuth.deletedAt, null);
  // 7. Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
