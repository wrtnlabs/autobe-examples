import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_listing_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first super administrator
  const firstSuperAdmin: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_super_admin_join(firstSuperAdmin, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: "/test",
      referrer: "/test",
    },
  });
  typia.assert(firstAuth);
  // 2. Create a second super administrator account
  const secondSuperAdmin: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_super_admin_join(secondSuperAdmin, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: "/test",
      referrer: "/test",
    },
  });
  typia.assert(secondAuth);
  // 3. Query super admin list with includeDeleted: true
  const response =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      firstSuperAdmin,
      {
        body: {
          includeDeleted: true,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata (nested structure: pagination.pagination.current/limit)
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 50",
    response.pagination.pagination.limit,
    50,
  );
  TestValidator.predicate("has data records", response.data.length > 0);
  // 5. Validate that data contains super admin records
  TestValidator.predicate(
    "first super admin is in list",
    response.data.some((admin) => admin.id === firstAuth.id),
  );
  TestValidator.predicate(
    "second super admin is in list",
    response.data.some((admin) => admin.id === secondAuth.id),
  );
  // 6. Validate active accounts have deletedAt as null
  const activeAdmins = response.data.filter(
    (admin) => admin.deletedAt === null,
  );
  TestValidator.predicate("has active accounts", activeAdmins.length > 0);
  // 7. Query without includeDeleted to verify only active accounts returned
  const activeOnlyResponse =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      firstSuperAdmin,
      {
        body: {
          includeDeleted: false,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(activeOnlyResponse);
  // 8. Validate that all returned accounts have deletedAt as null when includeDeleted is false
  for (const admin of activeOnlyResponse.data) {
    TestValidator.equals(
      "deletedAt is null when includeDeleted is false",
      admin.deletedAt,
      null,
    );
  }
}
