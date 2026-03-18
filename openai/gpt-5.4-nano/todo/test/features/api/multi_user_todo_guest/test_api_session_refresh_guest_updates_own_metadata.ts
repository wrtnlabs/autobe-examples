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

export async function test_api_session_refresh_guest_updates_own_metadata(
  connection: api.IConnection,
): Promise<void> {
  const deviceFingerprint = typia.random<string & tags.MinLength<1>>();
  // 1) Establish an active guest session
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestJoinConnection, {
    body: { deviceFingerprint } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  const guestConnection1: api.IConnection = { host: connection.host };
  guestConnection1.headers ??= {};
  guestConnection1.headers.Authorization = authorized.token.access;
  // 2) First refresh/update
  const initialExpiredAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 30,
  ).toISOString();
  const initialIp = typia.random<string & tags.Format<"ipv4">>();
  const initialHref = typia.random<string & tags.Format<"uri">>();
  const initialReferrer = typia.random<string & tags.Format<"uri">>();
  const summary1 =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnection1,
      {
        body: {
          ip: initialIp,
          href: initialHref,
          referrer: initialReferrer,
          expired_at: initialExpiredAt,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(summary1);
  // 3) Second refresh/update
  const summary2ExpiredAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const ip2 = typia.random<string & tags.Format<"ipv4">>();
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();
  const summary2 =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnection1,
      {
        body: {
          ip: ip2,
          href: href2,
          referrer: referrer2,
          expired_at: summary2ExpiredAt,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(summary2);

  type IHrefMax = string & tags.MaxLength<80000>;

  // 4) Validate stability and fields
  TestValidator.equals("session id stable", summary2.id, summary1.id);
  TestValidator.equals(
    "member id stable",
    summary2.multiUserTodoMemberId,
    summary1.multiUserTodoMemberId,
  );
  TestValidator.equals(
    "expiredAt matches 1",
    summary1.expiredAt,
    initialExpiredAt,
  );
  TestValidator.equals("ip matches 1", summary1.ip, initialIp);
  TestValidator.equals(
    "href matches 1",
    summary1.href as IHrefMax,
    initialHref as IHrefMax,
  );
  TestValidator.equals(
    "referrer matches 1",
    summary1.referrer as IHrefMax,
    initialReferrer as IHrefMax,
  );
  TestValidator.equals(
    "expiredAt matches 2",
    summary2.expiredAt,
    summary2ExpiredAt,
  );
  TestValidator.equals("ip matches 2", summary2.ip, ip2);
  TestValidator.equals(
    "href matches 2",
    summary2.href as IHrefMax,
    href2 as IHrefMax,
  );
  TestValidator.equals(
    "referrer matches 2",
    summary2.referrer as IHrefMax,
    referrer2 as IHrefMax,
  );
  // 5) Business-level edge: reject when providing an already-expired context
  const expiredPast = RandomGenerator.date(
    new Date(),
    -1000 * 60,
  ).toISOString();
  const ip3 = typia.random<string & tags.Format<"ipv4">>();
  const href3 = typia.random<string & tags.Format<"uri">>();
  const referrer3 = typia.random<string & tags.Format<"uri">>();
  await TestValidator.error(
    "reject refresh when session is already expired",
    async () => {
      await api.functional.multiUserTodo.guest.sessions.updateSession(
        guestConnection1,
        {
          body: {
            ip: ip3,
            href: href3,
            referrer: referrer3,
            expired_at: expiredPast,
          } satisfies IMultiUserTodoMemberSession.IRequest,
        },
      );
    },
  );
  // 6) Verify no side effects by re-establishing session context
  const guestJoinConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_guest_join(guestJoinConnection2, {
    body: { deviceFingerprint } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized2);
  const guestConnection2: api.IConnection = { host: connection.host };
  guestConnection2.headers ??= {};
  guestConnection2.headers.Authorization = authorized2.token.access;
  const summaryAfter =
    await api.functional.multiUserTodo.guest.sessions.updateSession(
      guestConnection2,
      {
        body: {} satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(summaryAfter);
  TestValidator.equals(
    "no side-effect on expired refresh - id",
    summaryAfter.id,
    summary2.id,
  );
  TestValidator.equals(
    "no side-effect on expired refresh - member id",
    summaryAfter.multiUserTodoMemberId,
    summary2.multiUserTodoMemberId,
  );
  TestValidator.equals(
    "no side-effect on expired refresh - expiredAt",
    summaryAfter.expiredAt,
    summary2.expiredAt,
  );
  TestValidator.equals(
    "no side-effect on expired refresh - ip",
    summaryAfter.ip,
    summary2.ip,
  );
  TestValidator.equals(
    "no side-effect on expired refresh - href",
    summaryAfter.href as IHrefMax,
    summary2.href as IHrefMax,
  );
  TestValidator.equals(
    "no side-effect on expired refresh - referrer",
    summaryAfter.referrer as IHrefMax,
    summary2.referrer as IHrefMax,
  );
}
