import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_system_settings_create } from "../../../generate/generate_random_ecommerce_super_administrator_system_settings_create";
import { prepare_random_ecommerce_system_setting } from "../../../prepare/prepare_random_ecommerce_system_setting";

export async function test_api_system_setting_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create first system setting using utility function
  const firstSetting =
    await generate_random_ecommerce_super_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "inventory.restock.threshold",
          value_type: "int",
          setting_value: "50",
          description: "Minimum inventory level before restocking",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(firstSetting);
  // Validate successful creation
  TestValidator.predicate(
    "first setting created successfully",
    () => firstSetting.setting_key === "inventory.restock.threshold",
  );
  // Attempt to create duplicate system setting with same key
  await TestValidator.error(
    "duplicate setting key should be rejected",
    async () => {
      await generate_random_ecommerce_super_administrator_system_settings_create(
        adminConnection,
        {
          body: {
            setting_key: "inventory.restock.threshold",
            value_type: "string",
            setting_value: "low",
            description: "Another setting with same key",
            is_active: false,
          } satisfies IEcommerceSystemSetting.ICreate,
        },
      );
    },
  );
}
