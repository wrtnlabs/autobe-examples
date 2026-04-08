import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_listing_filter_by_status_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(16) + "!1A") as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Filter by active status - validate all have deleted_at as null
  const activeResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active response has pagination",
    activeResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "active admins all have null deleted_at",
    activeResponse.data.every((admin) => admin.deleted_at === null),
  );
  // 3. Filter by deleted status - validate all have non-null deleted_at
  const deletedResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedResponse);
  TestValidator.equals(
    "deleted response has pagination",
    deletedResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "deleted admins all have non-null deleted_at",
    deletedResponse.data.every((admin) => admin.deleted_at !== null),
  );
  // 4. Search by partial match on name or email
  const searchTerm = RandomGenerator.name(1);
  const searchResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search response has pagination",
    searchResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "search results match partial term",
    searchResponse.data.every(
      (admin) =>
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // 5. Pagination with combined filters
  const combinedResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined response has pagination",
    combinedResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "combined results are active and match search",
    combinedResponse.data.every(
      (admin) =>
        admin.deleted_at === null &&
        (admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchTerm.toLowerCase())),
    ),
  );
}
