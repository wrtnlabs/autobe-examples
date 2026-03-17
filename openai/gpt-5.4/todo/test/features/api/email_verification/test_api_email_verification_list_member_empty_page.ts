import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_member_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorized);
  const request = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const firstPage: IPageITodoAppMemberEmailVerification.ISummary =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage: IPageITodoAppMemberEmailVerification.ISummary =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "empty page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("empty page limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "empty page has no records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page has zero pages",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.equals("empty page data length", firstPage.data.length, 0);
  TestValidator.equals("repeated read data length", secondPage.data.length, 0);
  TestValidator.equals(
    "repeated read keeps zero records",
    secondPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "read is idempotent for empty result",
    secondPage,
    firstPage,
  );
}
