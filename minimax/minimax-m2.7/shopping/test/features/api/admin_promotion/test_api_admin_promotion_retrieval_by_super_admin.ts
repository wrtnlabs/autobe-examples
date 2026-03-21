import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_promotion_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create admin account to be promoted
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 3. Promote admin to superAdmin and capture promotionId
  const promotion =
    await generate_random_ecommerce_mall_super_admin_admin_promotions_create(
      superAdminConnection,
      {
        body: {
          adminId: adminAuth.id,
          reason: "Test promotion for retrieval validation",
        },
      },
    );
  typia.assert(promotion);
  // 4. Retrieve the specific promotion record by promotionId
  const retrievedPromotion =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.at(
      superAdminConnection,
      {
        promotionId: promotion.id,
      },
    );
  typia.assert(retrievedPromotion);
  // 5. Validate retrieved promotion record
  TestValidator.equals(
    "promotion ID matches",
    retrievedPromotion.id,
    promotion.id,
  );
  TestValidator.equals(
    "action is promotion",
    retrievedPromotion.action,
    "promotion",
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedPromotion.admin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedPromotion.admin.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "admin name matches",
    retrievedPromotion.admin.name,
    adminAuth.name,
  );
  TestValidator.equals(
    "reason matches",
    retrievedPromotion.reason,
    "Test promotion for retrieval validation",
  );
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    !isNaN(Date.parse(retrievedPromotion.createdAt)),
  );
}
