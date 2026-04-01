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

export async function test_api_employee_invitations_list_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@test.com` satisfies string,
      password: "Test1234!" satisfies string,
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/join" satisfies string,
      referrer: "https://example.com/erp/hrm" satisfies string,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const scopedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const output =
    await api.functional.erpHrmTime.member.employees.invitations.index(
      scopedConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "createdAt",
          direction: "desc",
        } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata exists",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(output.data),
  );
  for (const invitation of output.data) {
    typia.assert(invitation);
    TestValidator.predicate(
      "invitation id populated",
      invitation.id.length > 0,
    );
    TestValidator.predicate(
      "invitation email populated",
      invitation.email.length > 0,
    );
    TestValidator.predicate(
      "invitation status populated",
      invitation.status.length > 0,
    );
  }
  if (output.data.length >= 2) {
    for (let i = 1; i < output.data.length; ++i) {
      TestValidator.predicate(
        "default newest-first ordering",
        output.data[i - 1].createdAt >= output.data[i].createdAt,
      );
    }
  }
  if (output.data.length > 0) {
    const first = output.data[0];
    const emailFiltered =
      await api.functional.erpHrmTime.member.employees.invitations.index(
        scopedConnection,
        {
          body: {
            email: first.email,
            page: 1,
            limit: 50,
          } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
        },
      );
    typia.assert(emailFiltered);
    TestValidator.predicate(
      "email filter keeps matching invitations only",
      emailFiltered.data.every((item) => item.email === first.email),
    );
    const statusFiltered =
      await api.functional.erpHrmTime.member.employees.invitations.index(
        scopedConnection,
        {
          body: {
            status:
              first.status as IErpHrmTimeEmployeeInvitation.IRequest["status"],
            page: 1,
            limit: 50,
          } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "status filter keeps matching invitations only",
      statusFiltered.data.every((item) => item.status === first.status),
    );
    const keyword = first.email.split("@")[0];
    const searchFiltered =
      await api.functional.erpHrmTime.member.employees.invitations.index(
        scopedConnection,
        {
          body: {
            search: keyword,
            page: 1,
            limit: 50,
          } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
        },
      );
    typia.assert(searchFiltered);
    TestValidator.predicate(
      "search keeps matching invitations only",
      searchFiltered.data.every(
        (item) => item.email.includes(keyword) || item.status.includes(keyword),
      ),
    );
    if (first.member !== undefined) {
      typia.assert(first.member);
    }
  }
  const pageSize = 1;
  const paged =
    await api.functional.erpHrmTime.member.employees.invitations.index(
      scopedConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
          sort: "createdAt",
          direction: "desc",
        } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "page size respected",
    paged.pagination.limit === pageSize,
  );
  TestValidator.predicate(
    "returned page is within available pages",
    paged.pagination.current >= 1 &&
      paged.pagination.current <= Math.max(1, paged.pagination.pages),
  );
}
