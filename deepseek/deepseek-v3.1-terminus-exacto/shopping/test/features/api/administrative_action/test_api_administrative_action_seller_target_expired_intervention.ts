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

export async function test_api_administrative_action_seller_target_expired_intervention(
  connection: api.IConnection,
): Promise<void> {
  // 创建管理员连接
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(adminAuth);
  // 创建设为干预目标的卖家账户
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      href: "http://example.com",
      referrer: "http://example.com",
    },
  });
  typia.assert(seller);
  // 创建基础的行政行动记录
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "warning_issued",
          general_description: "Test administrative action",
        },
      },
    );
  // 创建带有过去有效期的卖家干预记录
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7); // 7天前
  const sellerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
      adminConnection, // 使用管理员连接，而不是卖家连接
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: 7,
          effective_from: pastDate.toISOString(),
          effective_until: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 1,
          ).toISOString(), // 1天前
        },
      },
    );
  // 验证API成功返回过期的干预信息
  const retrievedTarget =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        sellerTargetId: sellerTarget.id,
      },
    );
  typia.assert(retrievedTarget);
  // 验证有效期的截止时间戳在过去
  TestValidator.predicate(
    "effective_until should be in the past",
    retrievedTarget.effective_until !== null &&
      new Date(retrievedTarget.effective_until) < new Date(),
  );
  // 验证干预记录的其他关键信息
  TestValidator.equals(
    "intervention_type matches",
    retrievedTarget.intervention_type,
    "account_suspension",
  );
  TestValidator.equals(
    "seller.id matches",
    retrievedTarget.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "administrativeAction.id matches",
    retrievedTarget.administrativeAction.id,
    administrativeAction.id,
  );
}
