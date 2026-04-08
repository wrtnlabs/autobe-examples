import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

interface IPaginationWithMeta {
  current: number;
  limit: number;
  records: number;
  pages: number;
}

export async function test_api_admin_password_reset_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call PATCH /ecommerceMall/superAdmin/admins/{adminId}/password-resets with pagination
  const response =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: superAdmin.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  const pagination = response.pagination as unknown as IPaginationWithMeta;
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current exists",
    pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.limit exists",
    pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.records exists",
    pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.pages exists",
    pagination.pages !== undefined,
    true,
  );
  // 4. Validate pagination values are non-negative
  TestValidator.predicate(
    "current page is valid",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    pagination.pages >= 0,
  );
  // 5. Validate limit does not exceed maximum (100)
  TestValidator.predicate(
    "limit does not exceed max",
    pagination.limit <= 100,
  );
  // 6. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 7. If records exist, validate each record structure
  if (response.data.length > 0) {
    for (const reset of response.data) {
      // Validate required fields exist
      TestValidator.equals("reset id exists", reset.id !== undefined, true);
      TestValidator.equals(
        "expiresAt exists",
        reset.expiresAt !== undefined,
        true,
      );
      TestValidator.equals(
        "createdAt exists",
        reset.createdAt !== undefined,
        true,
      );
      TestValidator.equals(
        "updatedAt exists",
        reset.updatedAt !== undefined,
        true,
      );
      // Validate admin summary structure
      TestValidator.equals("admin exists", reset.admin !== undefined, true);
      TestValidator.equals(
        "admin id exists",
        reset.admin.id !== undefined,
        true,
      );
      TestValidator.equals(
        "admin email exists",
        reset.admin.email !== undefined,
        true,
      );
      TestValidator.equals(
        "admin name exists",
        reset.admin.name !== undefined,
        true,
      );
      TestValidator.equals(
        "admin is_super_admin exists",
        reset.admin.is_super_admin !== undefined,
        true,
      );
      // Validate usedAt can be null or date-time
      if (reset.usedAt !== null) {
        TestValidator.predicate(
          "usedAt is date-time when not null",
          !isNaN(Date.parse(reset.usedAt)),
        );
      }
      // Validate timestamps are valid date-time formats
      TestValidator.predicate(
        "expiresAt is valid date-time",
        !isNaN(Date.parse(reset.expiresAt)),
      );
      TestValidator.predicate(
        "createdAt is valid date-time",
        !isNaN(Date.parse(reset.createdAt)),
      );
      TestValidator.predicate(
        "updatedAt is valid date-time",
        !isNaN(Date.parse(reset.updatedAt)),
      );
      // Token hash should NEVER be exposed in response
      TestValidator.equals("token hash not exposed", "token" in reset, false);
      TestValidator.equals(
        "password hash not exposed",
        "password" in reset,
        false,
      );
      TestValidator.equals("hash not exposed", "hash" in reset, false);
    }
    // 8. Validate records are sorted by createdAt descending (newest first)
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `record ${i} createdAt >= record ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
  // 9. Test with different pagination parameters
  const responsePage2 =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: superAdmin.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(responsePage2);
  const paginationPage2 = responsePage2.pagination as unknown as IPaginationWithMeta;
  TestValidator.equals("page 2 limit is 5", paginationPage2.limit, 5);
  TestValidator.equals(
    "page 2 current is 2",
    paginationPage2.current,
    2,
  );
  // 10. Test with status filter
  const responseActive =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: superAdmin.id,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(responseActive);
  TestValidator.equals(
    "status filter applied",
    responseActive.pagination !== undefined,
    true,
  );
}
