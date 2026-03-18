import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_refresh_guest_rejects_expired_session_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a guest session
  const deviceFingerprint = RandomGenerator.alphabets(12);
  const guestConnection1: api.IConnection = { host: connection.host };
  const authorized1: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection1, {
      body: { deviceFingerprint } satisfies IMultiUserTodoGuest.IJoin,
    });
  typia.assert(authorized1);

  const guestConnectionWithToken1: api.IConnection = { host: connection.host };
  guestConnectionWithToken1.headers ??= {};
  guestConnectionWithToken1.headers.Authorization = authorized1.token.access;

  // Set a known session metadata + future expiration
  const futureExpiredAt = new Date(Date.now() + 60000).toISOString();
  const initialBody: IMultiUserTodoMemberSession.IRequest = {
    ip: "127.0.0.10" satisfies string & tags.Format<"ipv4">,
    href: "https://example.com/original" satisfies string & tags.Format<"uri">,
    referrer:
      "https://example.com/original-ref" satisfies string & tags.Format<"uri">,
    expired_at: futureExpiredAt,
  };

  const originalSession: IMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnectionWithToken1,
      {
        body: initialBody,
      },
    );
  typia.assert(originalSession);

  // 2) Try to refresh/update with an expired_at in the past (should reject)
  const pastExpiredAt = new Date(Date.now() - 5000).toISOString();
  const attemptedUpdateBody: IMultiUserTodoMemberSession.IRequest = {
    ip: "127.0.0.20" satisfies string & tags.Format<"ipv4">,
    href: "https://example.com/attempted" satisfies string & tags.Format<"uri">,
    referrer:
      "https://example.com/attempted-ref" satisfies string & tags.Format<"uri">,
    expired_at: pastExpiredAt,
  };

  await TestValidator.error(
    "expired guest session should be rejected",
    async () => {
      await api.functional.multiUserTodo.guest.sessions.updateSession(
        guestConnectionWithToken1,
        {
          body: attemptedUpdateBody,
        },
      );
    },
  );

  // 3) Validate no side effects: metadata (including expiredAt) should remain unchanged
  const afterAttemptSession: IMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnectionWithToken1,
      {
        body: {} satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(afterAttemptSession);

  TestValidator.equals(
    "session id unchanged",
    afterAttemptSession.id,
    originalSession.id,
  );
  TestValidator.equals(
    "expiredAt unchanged",
    afterAttemptSession.expiredAt,
    originalSession.expiredAt,
  );
  TestValidator.equals(
    "session ip unchanged",
    afterAttemptSession.ip,
    originalSession.ip,
  );
  TestValidator.equals(
    "session href unchanged",
    afterAttemptSession.href,
    originalSession.href,
  );
  TestValidator.equals(
    "session referrer unchanged",
    afterAttemptSession.referrer,
    originalSession.referrer,
  );

  // 4) Establish a fresh session and retry update successfully
  const freshFingerprint = RandomGenerator.alphabets(12);
  const guestConnection2: api.IConnection = { host: connection.host };
  const authorized2: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection2, {
      body: {
        deviceFingerprint: freshFingerprint,
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  typia.assert(authorized2);

  const guestConnectionWithToken2: api.IConnection = { host: connection.host };
  guestConnectionWithToken2.headers ??= {};
  guestConnectionWithToken2.headers.Authorization = authorized2.token.access;

  const successExpiredAt = new Date(Date.now() + 120000).toISOString();
  const successBody: IMultiUserTodoMemberSession.IRequest = {
    ip: "127.0.0.30" satisfies string & tags.Format<"ipv4">,
    href: "https://example.com/success" satisfies string & tags.Format<"uri">,
    referrer:
      "https://example.com/success-ref" satisfies string & tags.Format<"uri">,
    expired_at: successExpiredAt,
  };

  const refreshedSession: IMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnectionWithToken2,
      {
        body: successBody,
      },
    );
  typia.assert(refreshedSession);

  TestValidator.equals(
    "session ip updated",
    refreshedSession.ip,
    successBody.ip,
  );

  const expectedHref = typia.assert<
    | (string & tags.MaxLength<80000>)
    | null
    | undefined
  >(successBody.href);
  const expectedReferrer = typia.assert<
    | (string & tags.MaxLength<80000>)
    | null
    | undefined
  >(successBody.referrer);

  TestValidator.equals(
    "session href updated",
    refreshedSession.href,
    expectedHref,
  );
  TestValidator.equals(
    "session referrer updated",
    refreshedSession.referrer,
    expectedReferrer,
  );
  TestValidator.equals(
    "session expiredAt updated",
    refreshedSession.expiredAt,
    successBody.expired_at,
  );
}
