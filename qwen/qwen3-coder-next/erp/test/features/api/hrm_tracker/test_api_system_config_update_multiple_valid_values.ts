import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_system_config_update_multiple_valid_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins organization to establish context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" + RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Update multiple valid configuration settings in separate calls
  // Note: SDK update function accepts single config per request, so multiple calls needed
  // Update fiscal_start_month (integer 1-12)
  const fiscalConfig = await api.functional.hrmTracker.member.configs.update(
    memberConnection,
    {
      body: {
        key: "fiscal_start_month",
        value: "1",
      } satisfies IHrmTrackerSystemConfig.IRequest,
    },
  );
  typia.assert(fiscalConfig);
  TestValidator.equals(
    "fiscal_start_month key",
    fiscalConfig.key,
    "fiscal_start_month",
  );
  TestValidator.equals("fiscal_start_month value", fiscalConfig.value, "1");
  // Update currency (ISO 4217 code)
  const currencyConfig = await api.functional.hrmTracker.member.configs.update(
    memberConnection,
    {
      body: {
        key: "currency",
        value: "KRW",
      } satisfies IHrmTrackerSystemConfig.IRequest,
    },
  );
  typia.assert(currencyConfig);
  TestValidator.equals("currency key", currencyConfig.key, "currency");
  TestValidator.equals("currency value", currencyConfig.value, "KRW");
  // Update timezone (IANA timezone)
  const timezoneConfig = await api.functional.hrmTracker.member.configs.update(
    memberConnection,
    {
      body: {
        key: "timezone",
        value: "Asia/Seoul",
      } satisfies IHrmTrackerSystemConfig.IRequest,
    },
  );
  typia.assert(timezoneConfig);
  TestValidator.equals("timezone key", timezoneConfig.key, "timezone");
  TestValidator.equals("timezone value", timezoneConfig.value, "Asia/Seoul");
  // Update display_name (string)
  const displayNameConfig =
    await api.functional.hrmTracker.member.configs.update(memberConnection, {
      body: {
        key: "display_name",
        value: "Test Organization",
      } satisfies IHrmTrackerSystemConfig.IRequest,
    });
  typia.assert(displayNameConfig);
  TestValidator.equals(
    "display_name key",
    displayNameConfig.key,
    "display_name",
  );
  TestValidator.equals(
    "display_name value",
    displayNameConfig.value,
    "Test Organization",
  );
  // 3. Verify all configurations have required timestamps
  TestValidator.predicate(
    "fiscal config has created_at",
    fiscalConfig.created_at !== null,
  );
  TestValidator.predicate(
    "fiscal config has updated_at",
    fiscalConfig.updated_at !== null,
  );
  TestValidator.predicate(
    "currency config has created_at",
    currencyConfig.created_at !== null,
  );
  TestValidator.predicate(
    "currency config has updated_at",
    currencyConfig.updated_at !== null,
  );
  TestValidator.predicate(
    "timezone config has created_at",
    timezoneConfig.created_at !== null,
  );
  TestValidator.predicate(
    "timezone config has updated_at",
    timezoneConfig.updated_at !== null,
  );
  TestValidator.predicate(
    "display_name config has created_at",
    displayNameConfig.created_at !== null,
  );
  TestValidator.predicate(
    "display_name config has updated_at",
    displayNameConfig.updated_at !== null,
  );
}
