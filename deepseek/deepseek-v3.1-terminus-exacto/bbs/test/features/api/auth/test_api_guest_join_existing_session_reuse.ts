import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_existing_session_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>() satisfies
    | string
    | undefined as string | undefined;
  // First join - create initial session
  const connection1: api.IConnection = { host: connection.host };
  const firstSession = await authorize_guest_join(connection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href,
      referrer,
      ip,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(firstSession);
  // Second join - same device fingerprint should reuse session
  const connection2: api.IConnection = { host: connection.host };
  const secondSession = await authorize_guest_join(connection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(), // Different href
      referrer: typia.random<string & tags.Format<"uri">>(), // Different referrer
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies
        | string
        | undefined as string | undefined, // Different IP (optional)
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(secondSession);
  // Validate session reuse
  TestValidator.equals(
    "same guest ID for duplicate device fingerprint",
    secondSession.id,
    firstSession.id,
  );
  TestValidator.equals(
    "device fingerprint preserved",
    secondSession.device_fingerprint,
    firstSession.device_fingerprint,
  );
  TestValidator.predicate(
    "created_at timestamps should match (same record)",
    firstSession.created_at === secondSession.created_at,
  );
  TestValidator.predicate(
    "deleted_at should remain null for active session",
    secondSession.deleted_at === null,
  );
  // Validate token continuity (tokens may be refreshed but should be valid)
  TestValidator.predicate(
    "access token should be non-empty",
    secondSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    secondSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be future ISO datetime",
    new Date(secondSession.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be future ISO datetime",
    new Date(secondSession.token.refreshable_until) > new Date(),
  );
}
