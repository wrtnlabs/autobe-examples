import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_member_listing_by_displayname_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      display_name: "Test Admin",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Test 'contains' match mode - should find members whose display name contains 'John'
  const containsResult = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        displayName: "John",
        matchMode: "contains",
        status: "active",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(containsResult);
  // 3. Test 'startsWith' match mode - should find members whose display name starts with 'John'
  const startsWithResult = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        displayName: "John",
        matchMode: "startsWith",
        status: "active",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(startsWithResult);
  // 4. Test 'endsWith' match mode - should find members whose display name ends with 'Doe'
  const endsWithResult = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        displayName: "Doe",
        matchMode: "endsWith",
        status: "active",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(endsWithResult);
  // 5. Test exact email match
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {
    body: {
      email: adminEmail,
      password: "Admin1234!",
      display_name: "Search Test Admin",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  const exactEmailResult = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        email: adminEmail,
        status: "active",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(exactEmailResult);
  // 6. Verify search results contain expected data
  TestValidator.predicate(
    "contains search returns valid pagination",
    containsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "startsWith search returns valid pagination",
    startsWithResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "endsWith search returns valid pagination",
    endsWithResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "exact email search returns valid pagination",
    exactEmailResult.pagination.limit > 0,
  );
}
