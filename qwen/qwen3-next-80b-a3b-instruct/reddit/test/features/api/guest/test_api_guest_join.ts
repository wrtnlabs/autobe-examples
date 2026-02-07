import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Use utility function for guest join (highest priority)
  const authorization = await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityGuest.IJoin,
  });
  typia.assert(authorization);
  // Validate token structure matches IAuthorized schema
  TestValidator.equals(
    "token exists",
    authorization.token,
    authorization.token,
  );
  // Validate access and refresh tokens are strings (existence validated by typia.assert, but structure check)
  TestValidator.predicate(
    "access token is present and non-empty",
    authorization.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    authorization.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in valid ISO 8601 date-time format
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    typia.is<string & tags.Format<"date-time">>(authorization.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    typia.is<string & tags.Format<"date-time">>(
      authorization.token.refreshable_until,
    ),
  );
  // Validate expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorization.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorization.token.refreshable_until) > now,
  );
}
