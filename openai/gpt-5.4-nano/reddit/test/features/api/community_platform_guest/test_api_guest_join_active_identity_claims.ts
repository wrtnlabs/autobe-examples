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

export async function test_api_guest_join_active_identity_claims(
  connection: api.IConnection,
): Promise<void> {
  const device_fingerprint = typia.random<string>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinPayload = {
    device_fingerprint,
    ip,
    href,
    referrer,
  } satisfies ICommunityPlatformGuest.IJoin;
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "guest identity is active (deleted_at is null)",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "guest device_fingerprint echoed",
    authorized.device_fingerprint,
    device_fingerprint,
  );
  TestValidator.predicate(
    "guest principal id present",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "guest has access token",
    authorized.access_token.length > 0,
  );
}
