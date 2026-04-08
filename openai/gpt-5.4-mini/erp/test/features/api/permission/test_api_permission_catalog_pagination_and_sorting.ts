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

export async function test_api_permission_catalog_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  const page = 2;
  const limit = 2;
  const paged = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {
        page,
        limit,
        sort: "key_asc",
      } satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals(
    "pagination current page",
    paged.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", paged.pagination.limit, limit);
  TestValidator.equals(
    "pagination total records matches page data bounds",
    paged.pagination.records >= paged.data.length,
    true,
  );
  TestValidator.equals(
    "pagination total pages are consistent",
    paged.pagination.pages,
    Math.ceil(paged.pagination.records / paged.pagination.limit),
  );
  TestValidator.equals(
    "permission list respects requested page size",
    paged.data.length <= limit,
    true,
  );
  const keyAsc = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "key_asc",
      } satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(keyAsc);
  const descriptionDesc =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "description_desc",
      } satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(descriptionDesc);
  TestValidator.predicate("key ascending sort is monotonic", () =>
    keyAsc.data.every(
      (item, index, array) => index === 0 || array[index - 1]!.key <= item.key,
    ),
  );
  TestValidator.predicate("description descending sort is monotonic", () =>
    descriptionDesc.data.every(
      (item, index, array) =>
        index === 0 || array[index - 1]!.description >= item.description,
    ),
  );
  TestValidator.predicate("summary payload exposes only public fields", () =>
    [...paged.data, ...keyAsc.data, ...descriptionDesc.data].every((item) =>
      Object.keys(item).every(
        (key) => key === "id" || key === "key" || key === "description",
      ),
    ),
  );
}
