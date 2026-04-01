import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_invitations_pagination_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const limit = 3;
  const firstPage =
    await api.functional.erpHrmTime.member.employees.invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.equals(
    "page metadata pages",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / limit),
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.erpHrmTime.member.employees.invitations.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit,
          } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "second page total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page total pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    const firstIds = firstPage.data.map((item) => item.id);
    const secondIds = secondPage.data.map((item) => item.id);
    TestValidator.predicate(
      "pages do not overlap",
      secondIds.every((id) => !firstIds.includes(id)),
    );
    TestValidator.predicate(
      "combined invitations remain unique",
      [...firstIds, ...secondIds].length ===
        new Set([...firstIds, ...secondIds]).size,
    );
  } else {
    TestValidator.equals(
      "single page current",
      firstPage.pagination.current,
      1,
    );
    TestValidator.predicate(
      "single page contains at most limit records",
      firstPage.data.length <= limit,
    );
  }
}
