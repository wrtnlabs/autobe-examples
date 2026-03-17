import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_self_search(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(join);
  const request = {
    email: join.email,
    deleted: false,
    page: 1,
    limit: 1,
  } satisfies ITodoAppMember.IRequest;
  const page = await api.functional.todoApp.members.index(memberConnection, {
    body: request,
  });
  typia.assert(page);
  TestValidator.equals(
    "self search returns exactly one record",
    page.data.length,
    1,
  );
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 1);
  TestValidator.equals("pagination record count", page.pagination.records, 1);
  TestValidator.equals("pagination page count", page.pagination.pages, 1);
  const summary = typia.assert(page.data[0]!);
  TestValidator.equals("summary id matches joined member", summary.id, join.id);
  TestValidator.equals(
    "summary email matches joined member",
    summary.email,
    join.email,
  );
  TestValidator.equals(
    "summary email verification matches joined member",
    summary.email_verified,
    join.email_verified,
  );
  TestValidator.equals(
    "summary created_at matches joined member",
    summary.created_at,
    join.created_at,
  );
  TestValidator.equals(
    "summary updated_at matches joined member",
    summary.updated_at,
    join.updated_at,
  );
  TestValidator.equals(
    "summary deleted_at matches joined member",
    summary.deleted_at,
    join.deleted_at,
  );
  TestValidator.equals(
    "newly joined member is active",
    summary.deleted_at,
    null,
  );
  const expected = {
    id: join.id,
    email: join.email,
    email_verified: join.email_verified,
    created_at: join.created_at,
    updated_at: join.updated_at,
    deleted_at: join.deleted_at,
  } satisfies ITodoAppMember.ISummary;
  TestValidator.equals(
    "summary exposes only safe account fields",
    summary,
    expected,
  );
}
