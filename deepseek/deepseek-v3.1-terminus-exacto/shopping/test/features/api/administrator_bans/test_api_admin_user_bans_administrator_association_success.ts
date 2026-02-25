import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
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
import { generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create";
import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";

export async function test_api_admin_user_bans_administrator_association_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // Generate random admin user ban ID for association
  const adminUserBanId = typia.random<string & tags.Format<"uuid">>();
  // Create administrator ban association using utility function
  const association =
    await generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create(
      adminConnection,
      {
        params: { adminUserBanId },
        body: {
          action_details: RandomGenerator.paragraph({ sentences: 2 }),
          previous_state: RandomGenerator.paragraph({ sentences: 1 }),
          new_state: "banned",
        },
      },
    );
  typia.assert(association);
  // Validate business logic only (no type validation after typia.assert)
  TestValidator.predicate(
    "association has valid administrative action",
    association.administrativeAction !== null,
  );
  TestValidator.predicate(
    "association has valid product reference",
    association.product !== null,
  );
  // Test duplicate association prevention (business logic)
  await TestValidator.error(
    "duplicate association should be prevented",
    async () => {
      await generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create(
        adminConnection,
        {
          params: { adminUserBanId },
          body: {
            product_id: association.product_id,
            action_details: "Duplicate association attempt",
          },
        },
      );
    },
  );
}
