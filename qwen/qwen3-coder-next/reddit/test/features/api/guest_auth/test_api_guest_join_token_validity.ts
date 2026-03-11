import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_token_validity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid device_id and perform guest join
  const device_id = typia.random<string & tags.Format<"uuid">>();
  const joinResponse = await authorize_guest_join(connection, {
    body: { device_id } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create a new connection with the obtained access token
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Validate token structure and properties
  TestValidator.predicate(
    "access token is valid",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid",
    joinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    joinResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    joinResponse.token.refreshable_until.length > 0,
  );
  // 4. Validate guest properties
  TestValidator.equals("device_id matches", joinResponse.device_id, device_id);
  TestValidator.predicate(
    "created_at is ISO string",
    new Date(joinResponse.created_at).toISOString() === joinResponse.created_at,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    new Date(joinResponse.updated_at).toISOString() === joinResponse.updated_at,
  );
}
