import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ecommerce_mall_super_admin_admins_soft_deleted_inclusion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * A super administrator needs to audit the complete administrator history
   * including accounts that have been soft-deleted (archived). The super admin
   * specifically sets includeDeleted=true in the request body to retrieve
   * administrators whose deleted_at field is not null. This is a critical
   * governance function for audit trails and compliance.
   */
  // 1. Create super admin connection for accessing auditor functions
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Test includeDeleted=true: should retrieve administrators including soft-deleted
  const resultWithDeleted =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: true,
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(resultWithDeleted);
  // 3. Validate response has standard paginated structure with data array
  TestValidator.predicate(
    "response has pagination metadata",
    resultWithDeleted.pagination.current >= 0 &&
      resultWithDeleted.pagination.limit > 0 &&
      resultWithDeleted.pagination.records >= 0 &&
      resultWithDeleted.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(resultWithDeleted.data),
  );
  // 4. Test default behavior (includeDeleted omitted): should exclude soft-deleted admins
  const resultDefault =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(resultDefault);
  // 5. Validate consistent structure between includeDeleted=true and default
  TestValidator.equals(
    "pagination structure consistent",
    Object.keys(resultWithDeleted.pagination).sort(),
    Object.keys(resultDefault.pagination).sort(),
  );
  // 6. Test includeDeleted=false (explicit): should also exclude soft-deleted
  const resultExcluded =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: false,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(resultExcluded);
  // 7. Validate that all responses contain proper summary data structure
  if (resultWithDeleted.data.length > 0) {
    const firstAdmin = resultWithDeleted.data[0];
    TestValidator.predicate(
      "admin summary has required fields",
      firstAdmin.id != null &&
        firstAdmin.email != null &&
        firstAdmin.grade != null &&
        firstAdmin.status != null &&
        firstAdmin.createdAt != null,
    );
  }
}
