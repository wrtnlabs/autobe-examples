import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IAutoBePaginationSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBePaginationSearch";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_populated_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const organizationName = RandomGenerator.name(3);
  const organizationDescription = RandomGenerator.paragraph({ sentences: 2 });
  const organizationCurrencyCode = "USD";
  const organizationTimezone = "Asia/Seoul";
  const organizationFiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const href = `https://example.com/join/${RandomGenerator.alphaNumeric(8)}`;
  const referrer = `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription,
      organizationCurrencyCode,
      organizationTimezone,
      organizationFiscalStartMonth,
      href: href satisfies string & tags.Format<"uri">,
      referrer: referrer satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const departments =
    await api.functional.erpHrmTimeTracking.member.departments.index(
      memberConnection,
      {
        body: {} satisfies IErpHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert(departments);
  TestValidator.predicate(
    "pagination.pages equals ceil(records/limit) when limit>0",
    departments.pagination.limit > 0
      ? departments.pagination.pages ===
          Math.ceil(
            departments.pagination.records / departments.pagination.limit,
          )
      : departments.pagination.pages === 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(departments.data));
  TestValidator.predicate(
    "all returned departments are active (deleted_at is null)",
    departments.data.every((d) => d.deleted_at === null),
  );
  TestValidator.predicate(
    "organization embedded object exists on each item",
    departments.data.every((d) => d.organization !== null),
  );
}
