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

export async function test_api_guest_sessions_authorization_and_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest/join",
      referrer: "https://example.com/referrer",
      email: typia.random<string & tags.Format<"email">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  await TestValidator.httpError(
    "guest sessions require authorization",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.guest.sessions.index(connection, {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeMemberSession.IRequest,
      });
    },
  );
  const firstPage = await api.functional.erpHrmTime.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "pages consistent with record count",
      firstPage.pagination.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "empty result has zero pages",
      firstPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result has zero data",
      firstPage.data.length,
      0,
    );
  }
  const maxLimitPage = await api.functional.erpHrmTime.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page number",
    maxLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit page size",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit records non-negative",
    maxLimitPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit pages non-negative",
    maxLimitPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "max limit data length within limit",
    maxLimitPage.data.length <= maxLimitPage.pagination.limit,
  );
  if (maxLimitPage.pagination.records > 0) {
    TestValidator.predicate(
      "max limit pages consistent with record count",
      maxLimitPage.pagination.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "max limit empty result has zero pages",
      maxLimitPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "max limit empty result has zero data",
      maxLimitPage.data.length,
      0,
    );
  }
}
