import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_browse_sort_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const firstPage =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(firstPage);
  const sortedByNameAsc =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "name",
          order: "asc",
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  const sortedByNameDesc =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "name",
          order: "desc",
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);
  TestValidator.equals(
    "organization browsing should preserve accessible set across sort changes",
    firstPage.data.map((item) => item.id).sort(),
    sortedByNameAsc.data.map((item) => item.id).sort(),
  );
  TestValidator.equals(
    "organization browsing should preserve accessible set across descending sort changes",
    firstPage.data.map((item) => item.id).sort(),
    sortedByNameDesc.data.map((item) => item.id).sort(),
  );
  if (firstPage.data.length > 0) {
    const searchTerm: string = firstPage.data[0].name;
    const searched =
      await api.functional.hrmTimeTracking.member.organizations.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 50,
            search: searchTerm,
          } satisfies IHrmTimeTrackingOrganization.IRequest,
        },
      );
    typia.assert(searched);
    TestValidator.predicate(
      "search results remain within accessible organization boundary",
      searched.data.every((org) =>
        firstPage.data.some((base) => base.id === org.id),
      ),
    );
    TestValidator.predicate(
      "ascending sort should be deterministic by name",
      sortedByNameAsc.data.every(
        (org, index, array) => index === 0 || array[index - 1].name <= org.name,
      ),
    );
    TestValidator.predicate(
      "descending sort should be deterministic by name",
      sortedByNameDesc.data.every(
        (org, index, array) => index === 0 || array[index - 1].name >= org.name,
      ),
    );
  }
  TestValidator.equals(
    "pagination should honor requested limit",
    firstPage.pagination.limit,
    50,
  );
  TestValidator.equals(
    "current page should be first page",
    firstPage.pagination.current,
    1,
  );
}
