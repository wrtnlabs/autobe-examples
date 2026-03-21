import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_admin_promotions_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promotions_create";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

export async function test_api_admin_promotion_filtered_by_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin (who will perform promotions)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create admin account to be promoted
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 3. Create another admin account for multiple promotions
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  // 4. Create promotion records using super admin credentials
  const promotion1 =
    await generate_random_ecommerce_mall_super_admin_admin_promotions_create(
      superAdminConnection,
      {
        body: {
          adminId: admin.id,
          reason: "First promotion test",
        },
      },
    );
  typia.assert(promotion1);
  // Create second promotion
  const promotion2 =
    await generate_random_ecommerce_mall_super_admin_admin_promotions_create(
      superAdminConnection,
      {
        body: {
          adminId: admin2.id,
          reason: "Second promotion test",
        },
      },
    );
  typia.assert(promotion2);
  // 5. Test filtering by action='promotion' with date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const promotionResults =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(promotionResults);
  // Verify all returned records are promotions within date range
  TestValidator.equals(
    "promotion records returned",
    promotionResults.data.length >= 2,
    true,
  );
  TestValidator.equals(
    "all actions are promotion",
    promotionResults.data.every((r) => r.action === "promotion"),
    true,
  );
  // Verify pagination reflects filtered count
  TestValidator.predicate(
    "records count >= 2",
    promotionResults.pagination.records >= 2,
  );
  // 6. Test filtering by action='demotion' (should return empty or less)
  const demotionResults =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          action: "demotion",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(demotionResults);
  TestValidator.predicate(
    "no demotion records in range",
    demotionResults.data.length === 0,
  );
  // 7. Test combining multiple filters (action + date range + admin_id)
  const filteredByAdmin =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
          admin_id: admin.id,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(filteredByAdmin);
  // Verify filtered results match criteria
  TestValidator.equals(
    "one record for specific admin",
    filteredByAdmin.data.length,
    1,
  );
  TestValidator.equals(
    "action is promotion",
    filteredByAdmin.data[0].action,
    "promotion",
  );
  TestValidator.equals(
    "admin id matches",
    filteredByAdmin.data[0].admin.id,
    admin.id,
  );
  // 8. Test pagination metadata with combined filters
  TestValidator.equals(
    "pagination records count",
    filteredByAdmin.pagination.records,
    1,
  );
  TestValidator.predicate(
    "pagination is valid",
    filteredByAdmin.pagination.pages >= 1,
  );
  // 9. Test date range that excludes promotions (should return empty)
  const oldDate = new Date(2020, 0, 1);
  const olderDate = new Date(2019, 0, 1);
  const noResults =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
          created_at_from: olderDate.toISOString(),
          created_at_to: oldDate.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no records in old date range",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    noResults.pagination.records,
    0,
  );
}
