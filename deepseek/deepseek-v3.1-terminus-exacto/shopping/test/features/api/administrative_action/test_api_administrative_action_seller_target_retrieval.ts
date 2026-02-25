import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_seller_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_seller_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * 测试管理员检索特定行政行动中的卖家目标详细信息。
 * 1. 创建管理员账户并认证管理员身份
 * 2. 创建设计为干预目标的卖家账户
 * 3. 创建行政行动记录
 * 4. 将卖家关联到行政行动中
 * 5. 检索卖家目标详细信息并验证字段完整性和正确性
 */
export async function test_api_administrative_action_seller_target_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员认证
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  typia.assert(adminAuth);
  // 2. 创建设计为干预目标的卖家账户
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. 创建行政行动记录
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "seller_suspension",
          general_description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(administrativeAction);
  // 4. 将卖家关联到行政行动中
  const sellerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
      adminConnection,
      {
        params: { administrativeActionId: administrativeAction.id },
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          restriction_scope: "all_products",
          effective_from: new Date().toISOString(),
          effective_until: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(sellerTarget);
  // 5. 检索卖家目标详细信息
  const retrievedSellerTarget =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        sellerTargetId: sellerTarget.id,
      },
    );
  typia.assert(retrievedSellerTarget);
  // 6. 验证字段完整性和正确性
  TestValidator.equals(
    "seller target ID should match",
    retrievedSellerTarget.id,
    sellerTarget.id,
  );
  TestValidator.equals(
    "intervention type should match",
    retrievedSellerTarget.intervention_type,
    "account_suspension",
  );
  TestValidator.equals(
    "suspension duration should match",
    retrievedSellerTarget.suspension_duration_days,
    sellerTarget.suspension_duration_days,
  );
  TestValidator.equals(
    "restriction scope should match",
    retrievedSellerTarget.restriction_scope,
    "all_products",
  );
  TestValidator.equals(
    "effective from should match",
    retrievedSellerTarget.effective_from,
    sellerTarget.effective_from,
  );
  TestValidator.equals(
    "effective until should match",
    retrievedSellerTarget.effective_until,
    sellerTarget.effective_until,
  );
  // 验证关联的行政行动信息
  TestValidator.equals(
    "administrative action ID should match",
    retrievedSellerTarget.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.equals(
    "administrative action type should match",
    retrievedSellerTarget.administrativeAction.action_type,
    "seller_suspension",
  );
  // 验证关联的卖家信息
  TestValidator.equals(
    "seller ID should match",
    retrievedSellerTarget.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email should match",
    retrievedSellerTarget.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller shop name should match",
    retrievedSellerTarget.seller.shop_name,
    sellerAuth.shop_name,
  );
}