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

export async function test_api_guest_join_new_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint for new guest session
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Create guest session using authorize_guest_join utility function
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies
        | string
        | undefined as string | undefined,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Validate the response structure - typia.assert performs complete validation
  typia.assert(guestSession);
  // Test duplicate device fingerprint returns existing session
  const duplicateSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(duplicateSession);
  // Validate business logic: same device fingerprint should return same guest ID
  TestValidator.equals(
    "same guest ID for duplicate fingerprint",
    guestSession.id,
    duplicateSession.id,
  );
}
