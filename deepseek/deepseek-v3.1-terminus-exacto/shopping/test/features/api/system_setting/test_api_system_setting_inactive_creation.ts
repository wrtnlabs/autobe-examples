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

export async function test_api_system_setting_inactive_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create inactive system setting using utility function
  const setting =
    await generate_random_ecommerce_super_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "feature.analytics.enabled",
          value_type: "boolean",
          setting_value: "false",
          description: "Analytics feature toggle",
          is_active: false,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(setting);
  // Validate the created setting properties
  TestValidator.equals(
    "setting key matches",
    setting.setting_key,
    "feature.analytics.enabled",
  );
  TestValidator.equals("value type matches", setting.value_type, "boolean");
  TestValidator.equals("setting value matches", setting.setting_value, "false");
  TestValidator.equals(
    "description matches",
    setting.description,
    "Analytics feature toggle",
  );
  TestValidator.equals("is active is false", setting.is_active, false);
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      setting.id,
    ),
  );
  TestValidator.predicate(
    "created at is valid date",
    new Date(setting.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at is valid date",
    new Date(setting.updated_at).getTime() > 0,
  );
  TestValidator.equals("deleted at is null", setting.deleted_at, null);
}
