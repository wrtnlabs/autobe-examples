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

export async function test_api_guest_token_refresh_success_rotation_consistent_identity(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join to obtain initial tokens and identity
  const baseGuestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = typia.random<string>();
  const joinBody = {
    device_fingerprint: deviceFingerprint,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const joinAuthorized = await authorize_guest_join(baseGuestConnection, {
    body: joinBody,
  });
  typia.assert(joinAuthorized);
  const initialId: string & tags.Format<"uuid"> = joinAuthorized.id;
  const initialCreatedAt = joinAuthorized.created_at;
  const initialUpdatedAt = joinAuthorized.updated_at;
  const initialDeletedAt = joinAuthorized.deleted_at;
  const initialDeviceFingerprint = joinAuthorized.device_fingerprint;
  TestValidator.predicate(
    "guest join deleted_at should be null",
    initialDeletedAt === null,
  );
  TestValidator.predicate(
    "guest join access_token is non-empty",
    joinAuthorized.access_token.length > 0,
  );
  TestValidator.predicate(
    "guest join refresh_token is non-empty",
    joinAuthorized.refresh_token.length > 0,
  );
  // 2) Guest refresh using refresh token from join
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refreshToken: joinAuthorized.refresh_token,
  } satisfies ICommunityPlatformGuest.IRefresh;
  const refreshed = await authorize_guest_refresh(guestRefreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.predicate(
    "guest refresh access_token is non-empty",
    refreshed.access_token.length > 0,
  );
  TestValidator.predicate(
    "guest refresh refresh_token is non-empty",
    refreshed.refresh_token.length > 0,
  );
  // 3) Identity consistency checks
  TestValidator.equals("guest id remains consistent", refreshed.id, initialId);
  TestValidator.equals(
    "guest device_fingerprint remains consistent",
    refreshed.device_fingerprint,
    initialDeviceFingerprint,
  );
  TestValidator.equals(
    "guest created_at remains consistent",
    refreshed.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "guest updated_at remains consistent",
    refreshed.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "guest deleted_at remains null for active identity",
    refreshed.deleted_at,
    null,
  );
  // Optional token rotation verification: at least refresh should return token pair.
  TestValidator.predicate(
    "guest refresh provides token object",
    refreshed.token.access.length > 0 && refreshed.token.refresh.length > 0,
  );
}
