import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_idempotent_replay(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const body = {} satisfies ICommunityPlatformGuest.IJoin;
  const first = await authorize_guest_join(guestConnection, { body });
  typia.assert(first);
  const second = await authorize_guest_join(guestConnection, { body });
  typia.assert(second);
  TestValidator.equals(
    "guest id should remain consistent on replay",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "access token should remain consistent on replay",
    second.token.access,
    first.token.access,
  );
  TestValidator.equals(
    "refresh token should remain consistent on replay",
    second.token.refresh,
    first.token.refresh,
  );
  TestValidator.equals(
    "access expiration should remain consistent on replay",
    second.token.expired_at,
    first.token.expired_at,
  );
  TestValidator.equals(
    "refreshable-until should remain consistent on replay",
    second.token.refreshable_until,
    first.token.refreshable_until,
  );
  TestValidator.predicate(
    "first token access should not be empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "first token refresh should not be empty",
    first.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second token access should not be empty",
    second.token.access.length > 0,
  );
  TestValidator.predicate(
    "second token refresh should not be empty",
    second.token.refresh.length > 0,
  );
}
