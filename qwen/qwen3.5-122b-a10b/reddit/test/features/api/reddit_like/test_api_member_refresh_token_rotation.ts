import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain initial JWT tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(initialAuth);
  // Store initial refresh token for invalidation testing
  const initialRefreshToken: string = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Perform first token refresh with initial refresh token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_refresh(firstRefreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(firstRefreshAuth);
  // Store new refresh token from first refresh
  const newRefreshToken: string = firstRefreshAuth.token.refresh;
  const newExpiredAt = firstRefreshAuth.token.expired_at;
  const newRefreshableUntil = firstRefreshAuth.token.refreshable_until;
  // 3. Verify access token expiration is extended
  const initialExpiredDate: Date = new Date(initialExpiredAt);
  const newExpiredDate: Date = new Date(newExpiredAt);
  TestValidator.predicate(
    "access token expiration extended",
    newExpiredDate.getTime() > initialExpiredDate.getTime(),
  );
  // 4. Verify refreshable_until is maintained or extended
  const initialRefreshableDate: Date = new Date(initialRefreshableUntil);
  const newRefreshableDate: Date = new Date(newRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until maintained or extended",
    newRefreshableDate.getTime() >= initialRefreshableDate.getTime(),
  );
  // 5. Attempt to use ORIGINAL refresh token after rotation - should fail with 401
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "original refresh token invalidated after rotation",
    401,
    async () => {
      await authorize_member_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
  // 6. Verify new refresh token can be used for subsequent refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_refresh(secondRefreshConnection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(secondRefreshAuth);
  // 7. Verify second refresh also extends expiration
  const secondExpiredDate: Date = new Date(secondRefreshAuth.token.expired_at);
  TestValidator.predicate(
    "second refresh extends expiration",
    secondExpiredDate.getTime() > newExpiredDate.getTime(),
  );
  // 8. Verify rotation chain continues (new token from second refresh works)
  const thirdRefreshConnection: api.IConnection = { host: connection.host };
  const thirdRefreshAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_refresh(thirdRefreshConnection, {
      body: {
        refresh_token: secondRefreshAuth.token.refresh,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(thirdRefreshAuth);
  // Final validation: all tokens are valid and properly rotated
  TestValidator.predicate(
    "rotation chain maintains valid tokens",
    thirdRefreshAuth.token.refresh !== secondRefreshAuth.token.refresh &&
      thirdRefreshAuth.token.refresh !== newRefreshToken &&
      thirdRefreshAuth.token.refresh !== initialRefreshToken,
  );
}
