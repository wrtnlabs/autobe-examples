import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_organization_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (member join)
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials =
    typia.random<IErpHrmTimeTrackingMember.IJoin>() satisfies IErpHrmTimeTrackingMember.IJoin;
  credentials.href =
    "https://example.com/join/" + RandomGenerator.alphaNumeric(10);
  credentials.referrer =
    "https://example.com/ref/" + RandomGenerator.alphaNumeric(10);
  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2) Create an organization within the same member context.
  const originalOrganization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "org-" + RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url:
            "https://example.com/logo-" +
            RandomGenerator.alphaNumeric(8) +
            ".png",
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month:
            3 satisfies IErpHrmTimeTrackingOrganization.ICreate["fiscal_start_month"],
        },
      },
    );
  typia.assert(originalOrganization);
  const createdAt = originalOrganization.created_at;
  const updatedAtBefore = originalOrganization.updated_at;
  // Ensure uniqueness for updated name by generating a new random one.
  const newName = "org-" + RandomGenerator.alphaNumeric(18) + "-updated";
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoUrl =
    "https://example.com/logo-" + RandomGenerator.alphaNumeric(10) + ".webp";
  const newCurrency = "EUR";
  const newTimezone = "Asia/Seoul";
  const newFiscalStartMonth =
    6 satisfies IErpHrmTimeTrackingOrganization.IUpdate["fiscal_start_month"];
  // 3) Update organization profile fields
  const updatedOrganization =
    await api.functional.erpHrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId: originalOrganization.id,
        body: {
          name: newName,
          description: newDescription,
          logo_url: logoUrl,
          currency_code: newCurrency,
          timezone: newTimezone,
          fiscal_start_month: newFiscalStartMonth,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  // 4) Validate timestamps
  TestValidator.equals(
    "created_at should be unchanged",
    updatedOrganization.created_at,
    createdAt,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedOrganization.updated_at).getTime() >
      new Date(updatedAtBefore).getTime(),
  );
  // 5) Validate updated fields match request
  TestValidator.equals(
    "id should match organizationId",
    updatedOrganization.id,
    originalOrganization.id,
  );
  TestValidator.equals(
    "name should be updated",
    updatedOrganization.name,
    newName,
  );
  TestValidator.equals(
    "description should be updated",
    updatedOrganization.description,
    newDescription,
  );
  TestValidator.equals(
    "logo_url should be updated",
    updatedOrganization.logo_url,
    logoUrl,
  );
  TestValidator.equals(
    "currency_code should be updated",
    updatedOrganization.currency_code,
    newCurrency,
  );
  TestValidator.equals(
    "timezone should be updated",
    updatedOrganization.timezone,
    newTimezone,
  );
  TestValidator.equals(
    "fiscal_start_month should be updated",
    updatedOrganization.fiscal_start_month,
    newFiscalStartMonth,
  );
}
