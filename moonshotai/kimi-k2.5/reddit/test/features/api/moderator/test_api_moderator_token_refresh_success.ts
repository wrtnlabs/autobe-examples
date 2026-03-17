import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as moderator to get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_moderator_join(joinConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // Step 2: Call refresh endpoint with the valid refresh_token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies IRedditLikeModerator.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate response contains new tokens
  TestValidator.notEquals(
    "access token should be different",
    initialAuth.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    initialAuth.token.refresh,
    refreshResult.token.refresh,
  );
  // Step 4: Verify expired_at and refreshable_until timestamps are future times
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expiration should be in the future",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshResult.token.refreshable_until > now,
  );
  // Step 5: Verify moderator identity remains consistent
  TestValidator.equals(
    "moderator id should match",
    initialAuth.id,
    refreshResult.id,
  );
  TestValidator.equals(
    "moderator can_add_moderators should match",
    initialAuth.can_add_moderators,
    refreshResult.can_add_moderators,
  );
  TestValidator.equals(
    "moderator member id should match",
    initialAuth.member.id,
    refreshResult.member.id,
  );
  TestValidator.equals(
    "moderator community id should match",
    initialAuth.community.id,
    refreshResult.community.id,
  );
  TestValidator.equals(
    "created_at should match",
    initialAuth.created_at,
    refreshResult.created_at,
  );
}
