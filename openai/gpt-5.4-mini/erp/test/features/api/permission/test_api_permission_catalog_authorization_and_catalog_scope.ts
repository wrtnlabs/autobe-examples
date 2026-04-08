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

export async function test_api_permission_catalog_authorization_and_catalog_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erp/member/join",
      referrer: "https://example.com/erp",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const catalog = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(catalog);
  TestValidator.predicate(
    "permission catalog returns at least one permission",
    catalog.data.length > 0,
  );
  TestValidator.predicate(
    "permission catalog is paginated",
    catalog.pagination.records >= catalog.data.length,
  );
  TestValidator.equals(
    "default permission catalog page",
    catalog.pagination.current,
    1,
  );
  TestValidator.equals(
    "default permission catalog limit",
    catalog.pagination.limit,
    catalog.data.length,
  );
  const filteredCatalog =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: {
        deleted: false,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(filteredCatalog);
  TestValidator.predicate(
    "filtered permission catalog is not empty",
    filteredCatalog.data.length > 0,
  );
  TestValidator.predicate(
    "filtered permission catalog does not exceed approved catalog size",
    filteredCatalog.data.length <= catalog.data.length,
  );
  TestValidator.predicate(
    "filtered catalog permissions are canonical approved entries",
    filteredCatalog.data.every((permission) =>
      catalog.data.some((canonical) => canonical.id === permission.id),
    ),
  );
}
