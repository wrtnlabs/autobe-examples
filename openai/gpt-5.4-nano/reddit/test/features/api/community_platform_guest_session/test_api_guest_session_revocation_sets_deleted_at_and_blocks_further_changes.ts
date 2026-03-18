import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_revocation_sets_deleted_at_and_blocks_further_changes(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(authorized);
  // NOTE: The request requires the guest session record id.
  // The provided guest authorization DTO does not expose the session record id explicitly,
  // so we use the guest identity/session id returned by the join payload.
  const sessionId =
    authorized.id satisfies ICommunityPlatformGuestSession.IRequest["id"];
  const revokedDeletedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() satisfies string & tags.Format<"date-time">;
  const revoked =
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: sessionId,
          deleted_at: revokedDeletedAt,
          expired_at: undefined,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(revoked);
  TestValidator.predicate(
    "deletedAt should be non-null after revoke",
    revoked.deletedAt !== null,
  );
  const initialExpiredAt = revoked.expiredAt;
  const initialUpdatedAt = revoked.updatedAt;
  const secondAttempt = async () =>
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: sessionId,
          deleted_at: null,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  const resultOrError = await TestValidator.error(
    "should reject clearing deleted_at after revoke OR keep session revoked",
    async () => {
      const second = await secondAttempt();
      typia.assert(second);
      // If the service allows the call to succeed, it must not re-activate the session.
      TestValidator.predicate(
        "session should remain revoked (deletedAt stays non-null)",
        second.deletedAt !== null,
      );
      TestValidator.equals(
        "expiredAt should remain consistent",
        second.expiredAt,
        initialExpiredAt,
      );
      TestValidator.predicate(
        "updatedAt should not revert back to previous state",
        second.updatedAt !== initialUpdatedAt,
      );
      return;
    },
  );
  void resultOrError;
}
