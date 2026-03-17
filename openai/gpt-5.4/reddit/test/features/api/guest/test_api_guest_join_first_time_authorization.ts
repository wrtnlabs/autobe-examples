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

export async function test_api_guest_join_first_time_authorization(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const body = {
    href: `https://guest.${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`,
    referrer: `https://ref.${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`,
  } satisfies ICommunityPlatformGuest.IJoin;
  const authorized: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "guest join keeps active identity",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "guest key is non-empty",
    authorized.guest_key.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    authorized.token.access,
    authorized.token.refresh,
  );
  TestValidator.equals(
    "connection authorization header is updated to access token",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
  const createdAt = new Date(authorized.created_at).getTime();
  const updatedAt = new Date(authorized.updated_at).getTime();
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "created_at is parseable",
    Number.isFinite(createdAt),
  );
  TestValidator.predicate(
    "updated_at is parseable",
    Number.isFinite(updatedAt),
  );
  TestValidator.predicate(
    "token expired_at is parseable",
    Number.isFinite(expiredAt),
  );
  TestValidator.predicate(
    "token refreshable_until is parseable",
    Number.isFinite(refreshableUntil),
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAt >= createdAt,
  );
  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    refreshableUntil >= expiredAt,
  );
}
