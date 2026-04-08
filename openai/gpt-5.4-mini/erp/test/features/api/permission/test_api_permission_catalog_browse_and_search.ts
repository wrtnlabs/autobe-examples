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

export async function test_api_permission_catalog_browse_and_search(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(10)}Aa1!`,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erpHrmTime/member/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const browseRequest = {
    page: 1,
    limit: 20,
  } satisfies IErpHrmTimePermission.IRequest;
  const browse = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    { body: browseRequest },
  );
  typia.assert(browse);
  TestValidator.equals("browse current page", browse.pagination.current, 1);
  TestValidator.equals("browse limit", browse.pagination.limit, 20);
  TestValidator.predicate(
    "browse records non-negative",
    browse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "browse pages non-negative",
    browse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "browse item count matches page size",
    browse.data.length,
    Math.min(browse.pagination.limit, browse.pagination.records),
  );
  TestValidator.equals(
    "default browse order is key ascending",
    [...browse.data].sort((left, right) => left.key.localeCompare(right.key)),
    browse.data,
  );
  for (const permission of browse.data) {
    TestValidator.predicate("permission id exists", permission.id.length > 0);
    TestValidator.predicate("permission key exists", permission.key.length > 0);
    TestValidator.predicate(
      "permission description exists",
      permission.description.length > 0,
    );
  }
  const searchKeyword = "view";
  const searched = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(searched);
  TestValidator.equals("search current page", searched.pagination.current, 1);
  TestValidator.equals("search limit", searched.pagination.limit, 20);
  TestValidator.predicate(
    "search records non-negative",
    searched.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search pages non-negative",
    searched.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search filters by keyword in key or description",
    searched.data.every(
      (permission) =>
        permission.key.toLowerCase().includes(searchKeyword) ||
        permission.description.toLowerCase().includes(searchKeyword),
    ),
  );
  TestValidator.equals(
    "search order is key ascending",
    [...searched.data].sort((left, right) => left.key.localeCompare(right.key)),
    searched.data,
  );
  TestValidator.predicate(
    "search results do not exceed limit",
    searched.data.length <= searched.pagination.limit,
  );
}
