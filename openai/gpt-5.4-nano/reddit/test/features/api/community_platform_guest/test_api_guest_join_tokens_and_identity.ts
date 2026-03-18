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

export async function test_api_guest_join_tokens_and_identity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1 & 2: join with stable device_fingerprint and validate response
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = typia.random<string & tags.Format<"uuid">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinBody1 = {
    device_fingerprint: deviceFingerprint,
    ip,
    href,
    referrer,
  } satisfies ICommunityPlatformGuest.IJoin;
  const authorized1 = await authorize_guest_join(guestConnection, {
    body: joinBody1,
  });
  typia.assert(authorized1);
  TestValidator.equals(
    "guest device_fingerprint preserved",
    authorized1.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "access_token is non-empty",
    authorized1.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty",
    authorized1.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "token.access present",
    authorized1.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh present",
    authorized1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is date-time",
    authorized1.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is date-time",
    authorized1.token.refreshable_until.length > 0,
  );
  // Response datetime contract
  TestValidator.predicate(
    "identity created_at is date-time",
    authorized1.created_at.length > 0,
  );
  TestValidator.predicate(
    "identity updated_at is date-time",
    authorized1.updated_at.length > 0,
  );
  TestValidator.predicate(
    "identity deleted_at either null or date-time",
    authorized1.deleted_at === null || authorized1.deleted_at.length > 0,
  );
  // Scenario 2: call again with same device_fingerprint but different context
  const guestConnection2: api.IConnection = { host: connection.host };
  const joinBody2 = {
    device_fingerprint: deviceFingerprint,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const authorized2 = await authorize_guest_join(guestConnection2, {
    body: joinBody2,
  });
  typia.assert(authorized2);
  TestValidator.equals(
    "guest device_fingerprint preserved on second join",
    authorized2.device_fingerprint,
    deviceFingerprint,
  );
  // Upsert semantics: stable key identifies guest row.
  // The contract may reuse id or create a new one; in both cases tokens must work.
  TestValidator.predicate(
    "second join issues access token",
    authorized2.access_token.length > 0,
  );
  TestValidator.predicate(
    "second join issues refresh token",
    authorized2.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "second join identity not deleted",
    authorized2.deleted_at === null,
  );
}
