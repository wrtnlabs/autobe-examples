import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_empty_page_for_unmatched_member_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const request = {
    token: `unmatched-token-${RandomGenerator.alphaNumeric(24)}`,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies ITodoAppMemberPasswordReset.IRequest;
  const page = await api.functional.todoApp.member.passwordResets.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "requested page is preserved",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is preserved",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals("empty result contains no records", page.data, []);
  TestValidator.equals("no matching records are returned", page.data.length, 0);
  TestValidator.equals(
    "record count is zero for unmatched member filters",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "page count is zero when there are no matching records",
    page.pagination.pages,
    0,
  );
}
