import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_permission_and_date_scope(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous access to activity log should be denied",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        anonymousConnection,
        {
          body: {
            page: 1,
            limit: 10,
            createdAtFrom: "2026-04-01T00:00:00.000Z",
            createdAtTo: "2026-04-02T00:00:00.000Z",
          } satisfies IErpHrmTimeActivityLogEntry.IRequest,
        },
      );
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const from = new Date("2026-04-01T00:00:00.000Z");
  const to = new Date("2026-04-02T00:00:00.000Z");
  const page =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 50,
          createdAtFrom: from.toISOString(),
          createdAtTo: to.toISOString(),
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "activity log pagination current page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "activity log pagination limit",
    page.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "activity log pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "activity log pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
  for (const entry of page.data) {
    TestValidator.predicate(
      "activity log entry timestamp is within the requested date range",
      entry.createdAt >= from.toISOString() &&
        entry.createdAt <= to.toISOString(),
    );
  }
}
