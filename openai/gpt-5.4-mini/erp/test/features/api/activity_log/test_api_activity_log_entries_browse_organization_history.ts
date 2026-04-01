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

export async function test_api_activity_log_entries_browse_organization_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const page =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page slice does not exceed limit",
    page.data.length <= page.pagination.limit,
    true,
  );
  TestValidator.equals(
    "page metadata records are non-negative",
    page.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "page metadata pages are non-negative",
    page.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "page size matches pagination expectations",
    page.data.length,
    Math.min(page.pagination.limit, page.pagination.records),
  );
  TestValidator.equals(
    "page count is consistent with records",
    page.pagination.pages,
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit),
  );
  ArrayUtil.repeat(page.data.length, (index) => {
    const entry = page.data[index];
    typia.assert(entry);
    TestValidator.predicate(
      "activity log entry id exists",
      entry.id.length > 0,
    );
    TestValidator.predicate(
      "activity log organization summary exists",
      entry.organization !== null && entry.organization !== undefined,
    );
    TestValidator.predicate(
      "activity log member summary exists",
      entry.member !== null && entry.member !== undefined,
    );
    TestValidator.predicate(
      "activity log action type exists",
      entry.actionType.length > 0,
    );
    TestValidator.predicate(
      "activity log target entity type exists",
      entry.targetEntityType.length > 0,
    );
    TestValidator.predicate(
      "activity log target entity id exists",
      entry.targetEntityId.length > 0,
    );
    TestValidator.predicate(
      "activity log details exist",
      entry.details.length > 0,
    );
    TestValidator.predicate(
      "activity log createdAt exists",
      entry.createdAt.length > 0,
    );
    TestValidator.predicate(
      "activity log updatedAt exists",
      entry.updatedAt.length > 0,
    );
    TestValidator.equals(
      "activity log deletedAt is null",
      entry.deletedAt,
      null,
    );
  });
}
