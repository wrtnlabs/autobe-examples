import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_permission_catalog_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email:
        `member_${Date.now()}_${Math.floor(Math.random() * 1000000)}@test.com` satisfies string &
          tags.Format<"email">,
      password: "Passw0rd!" satisfies string & tags.Format<"password">,
      name: "Permission Browser",
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const pagedRequest = {
    page: 1,
    limit: 2,
    sort: "key",
    order: "asc",
  } satisfies IErpHrmTimePermission.IRequest;
  const firstPage = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    { body: pagedRequest },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "permission catalog current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "permission catalog page size",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "permission catalog total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "permission catalog total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "permission catalog data does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const permission of firstPage.data) typia.assert(permission);
  const repeatedPage = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    { body: pagedRequest },
  );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "permission catalog repeated request is stable",
    repeatedPage.data.map((item) => item.id),
    firstPage.data.map((item) => item.id),
  );
  TestValidator.equals(
    "permission catalog repeated pagination metadata is stable",
    repeatedPage.pagination,
    firstPage.pagination,
  );
  const searchRequest = {
    search: "view",
    page: 1,
    limit: 5,
    sort: "key",
    order: "asc",
  } satisfies IErpHrmTimePermission.IRequest;
  const searchPage = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    { body: searchRequest },
  );
  typia.assert(searchPage);
  TestValidator.equals(
    "search result current page",
    searchPage.pagination.current,
    1,
  );
  TestValidator.equals("search result limit", searchPage.pagination.limit, 5);
  TestValidator.predicate(
    "search result data does not exceed limit",
    searchPage.data.length <= searchPage.pagination.limit,
  );
  TestValidator.predicate(
    "search result summaries are lightweight",
    searchPage.data.every(
      (permission) =>
        typeof permission.id === "string" &&
        typeof permission.key === "string" &&
        typeof permission.description === "string",
    ),
  );
  for (const permission of searchPage.data) typia.assert(permission);
  const searchPageRepeated =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: searchRequest,
    });
  typia.assert(searchPageRepeated);
  TestValidator.equals(
    "search results remain deterministic across repeated requests",
    searchPageRepeated.data.map((item) => item.id),
    searchPage.data.map((item) => item.id),
  );
  TestValidator.equals(
    "search pagination metadata remains deterministic",
    searchPageRepeated.pagination,
    searchPage.pagination,
  );
}
