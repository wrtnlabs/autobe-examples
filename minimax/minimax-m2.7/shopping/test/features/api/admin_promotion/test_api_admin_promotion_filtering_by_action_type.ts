import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_promotion_filtering_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Query admin-promotions with action filter set to 'promotion'
  const response =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination info",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 4. Validate all records have action === 'promotion'
  for (const record of response.data) {
    TestValidator.equals(
      "record action is 'promotion'",
      record.action,
      "promotion",
    );
    // 5. Validate admin summary fields exist
    TestValidator.predicate("admin has id", record.admin.id !== undefined);
    TestValidator.predicate(
      "admin has email",
      record.admin.email !== undefined,
    );
    TestValidator.predicate("admin has name", record.admin.name !== undefined);
    TestValidator.predicate(
      "admin has is_super_admin",
      typeof record.admin.is_super_admin === "boolean",
    );
    // 6. Validate performed by super admin summary
    TestValidator.predicate(
      "performed by super admin has id",
      record.performedBySuperAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "performed by super admin has email",
      record.performedBySuperAdmin.email !== undefined,
    );
  }
  // 7. If records exist, validate no demotion records are present
  if (response.data.length > 0) {
    const hasDemotion = response.data.some(
      (record) => record.action === "demotion",
    );
    TestValidator.equals(
      "no demotion records in promotion filter results",
      hasDemotion,
      false,
    );
  }
}
