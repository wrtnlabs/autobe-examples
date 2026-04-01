import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/guest/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  const sessions = await api.functional.erpHrmTime.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  TestValidator.equals(
    "pagination current defaults to first page",
    sessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    sessions.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination metadata is consistent with records and limit",
    sessions.pagination.limit === 0
      ? sessions.pagination.records === 0 && sessions.pagination.pages === 0
      : sessions.pagination.pages ===
          Math.ceil(sessions.pagination.records / sessions.pagination.limit),
  );
  TestValidator.predicate(
    "returned sessions do not exceed the reported limit",
    sessions.data.length <= sessions.pagination.limit ||
      sessions.pagination.limit === 0,
  );
  if (sessions.data.length >= 2) {
    TestValidator.predicate(
      "default ordering returns newest sessions first",
      sessions.data.every(
        (session, index, array) =>
          index === 0 ||
          new Date(array[index - 1].createdAt).getTime() >=
            new Date(session.createdAt).getTime(),
      ),
    );
  }
  TestValidator.predicate(
    "session summaries include only listable data",
    sessions.data.every(
      (session) =>
        typeof session.id === "string" &&
        typeof session.ip === "string" &&
        typeof session.href === "string" &&
        typeof session.referrer === "string" &&
        typeof session.createdAt === "string" &&
        typeof session.expiredAt === "string",
    ),
  );
}
