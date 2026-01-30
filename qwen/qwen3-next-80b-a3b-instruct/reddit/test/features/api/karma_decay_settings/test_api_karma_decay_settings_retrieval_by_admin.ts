import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaDecaySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaDecaySettings";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_decay_settings_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Retrieve karma decay settings using admin-specific connection
  const settings: ICommunityBbsKarmaDecaySettings =
    await api.functional.communityBbs.admin.karma_decay_settings.at(
      adminConnection,
    );
  // Step 3: Validate all required fields exist with proper defaults
  // decay_rate should be 0.05 (5% per hour) as default
  TestValidator.equals("decay_rate is 0.05", settings.decay_rate, 0.05);
  // grace_period_hours should be 168 (7 days) as default
  TestValidator.equals(
    "grace_period_hours is 168",
    settings.grace_period_hours,
    168,
  );
  // max_decay_per_day should be 10 as default
  TestValidator.equals(
    "max_decay_per_day is 10",
    settings.max_decay_per_day,
    10,
  );
  // is_enabled should be true as default
  TestValidator.equals("is_enabled is true", settings.is_enabled, true);
  // Step 4: Verify all properties are properly typed
  typia.assert(settings);
}
