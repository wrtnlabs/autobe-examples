import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_partial_update_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinResult);
  // 3. Login the member to get organization context
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(loginResult);
  // Verify member has at least one organization
  TestValidator.predicate(
    "member has organizations",
    loginResult.organizations !== undefined &&
      loginResult.organizations.length > 0,
  );
  const organizationId = loginResult.organizations![0].id;
  const originalName = loginResult.organizations![0].name;
  const originalCurrency = loginResult.organizations![0].currency;
  const originalTimezone = loginResult.organizations![0].timezone;
  const originalFiscalMonth = loginResult.organizations![0].fiscal_start_month satisfies number as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>;
  // 4. Perform partial update - only modify currency and timezone
  const newCurrency = "EUR";
  const newTimezone = "Europe/London";
  const updated = await api.functional.hrm.member.organizations.update(
    loginConnection,
    {
      organizationId,
      body: {
        name: originalName, // Keep name the same to test partial update
        currency: newCurrency,
        timezone: newTimezone,
      } satisfies IHrmOrganization.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Verify modified fields have new values
  TestValidator.equals(
    "currency updated to EUR",
    updated.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone updated to Europe/London",
    updated.timezone,
    newTimezone,
  );
  // 6. Verify unchanged fields retain original values
  TestValidator.equals("name unchanged", updated.name, originalName);
  TestValidator.equals(
    "fiscal_start_month unchanged",
    updated.fiscal_start_month,
    originalFiscalMonth,
  );
  // 7. Verify updated_at timestamp reflects the update operation
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
}