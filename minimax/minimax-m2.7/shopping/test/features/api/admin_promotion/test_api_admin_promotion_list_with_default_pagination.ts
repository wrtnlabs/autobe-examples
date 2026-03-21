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

export async function test_api_admin_promotion_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin for listing promotions
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create second super admin who will perform promotions
  const performerConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(performerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create admin accounts to be promoted
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create promotion records
  await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
    performerConnection,
    {
      body: {
        adminId: admin1Auth.id,
        reason: "Test promotion for pagination testing",
      } satisfies IEcommerceMallAdminPromotion.ICreate,
    },
  );
  await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
    performerConnection,
    {
      body: {
        adminId: admin2Auth.id,
      } satisfies IEcommerceMallAdminPromotion.ICreate,
    },
  );
  // 5. Test default pagination - call endpoint with empty body
  const promotionList =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(promotionList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination.current is 1",
    promotionList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    promotionList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is positive",
    promotionList.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination.pages is positive",
    promotionList.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination.limit <= 100",
    promotionList.pagination.limit <= 100,
  );
  // 7. Validate data structure
  TestValidator.predicate("data is array", Array.isArray(promotionList.data));
  TestValidator.predicate(
    "data has at least 2 records",
    promotionList.data.length >= 2,
  );
  // Validate record structure
  const firstRecord = promotionList.data[0];
  TestValidator.predicate("record has id", !!firstRecord.id);
  TestValidator.predicate("record has action", !!firstRecord.action);
  TestValidator.equals("action is promotion", firstRecord.action, "promotion");
  TestValidator.predicate("record has admin", !!firstRecord.admin);
  TestValidator.predicate("admin has id", !!firstRecord.admin.id);
  TestValidator.predicate("admin has email", !!firstRecord.admin.email);
  TestValidator.predicate("admin has name", !!firstRecord.admin.name);
  TestValidator.predicate(
    "admin has created_at",
    !!firstRecord.admin.created_at,
  );
  TestValidator.predicate(
    "admin has updated_at",
    !!firstRecord.admin.updated_at,
  );
  TestValidator.predicate(
    "performedBySuperAdmin exists",
    !!firstRecord.performedBySuperAdmin,
  );
  TestValidator.predicate(
    "performedBySuperAdmin has id",
    !!firstRecord.performedBySuperAdmin.id,
  );
  TestValidator.predicate(
    "performedBySuperAdmin has email",
    !!firstRecord.performedBySuperAdmin.email,
  );
  TestValidator.predicate(
    "performedBySuperAdmin has created_at",
    !!firstRecord.performedBySuperAdmin.created_at,
  );
  TestValidator.predicate("record has created_at", !!firstRecord.created_at);
  // 8. Verify regular admin cannot access this endpoint (403 Forbidden)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await TestValidator.httpError(
    "regular admin cannot access promotion list",
    403,
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin_promotions.index(
        regularAdminConnection,
        {
          body: {} satisfies IEcommerceMallAdminPromotion.IRequest,
        },
      );
    },
  );
}
