import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_organizations_snapshots_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_organizations_snapshot } from "../../../prepare/prepare_random_hrm_platform_organizations_snapshot";

export async function test_api_organization_snapshot_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      org_name: "Initial Corp",
      org_currency: "USD",
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create organization with comprehensive settings
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = { ...memberConnection.headers };
  const organization =
    await api.functional.hrmPlatform.member.organizations.create(
      orgConnection,
      {
        body: {
          name: "Complete Corp",
          description:
            "Full-featured organization with comprehensive settings for all optional fields",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 7,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create snapshot with all optional fields populated
  const snapshotConnection: api.IConnection = { host: connection.host };
  snapshotConnection.headers = { ...orgConnection.headers };
  const snapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      snapshotConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Complete Corp",
          description:
            "Full-featured organization with comprehensive settings for all optional fields",
          logo_uri: "https://example.com/logo.png",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 7,
          status: "active",
          metadata: JSON.stringify({
            extendedConfig: { featureFlag: true, theme: "dark" },
          }),
        } satisfies IHrmPlatformOrganizationsSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Validate all fields are captured correctly
  TestValidator.equals("snapshot name", snapshot.name, "Complete Corp");
  TestValidator.equals(
    "snapshot description",
    snapshot.description,
    "Full-featured organization with comprehensive settings for all optional fields",
  );
  TestValidator.equals(
    "snapshot logo_uri",
    snapshot.logo_uri,
    "https://example.com/logo.png",
  );
  TestValidator.equals("snapshot currency", snapshot.currency, "USD");
  TestValidator.equals(
    "snapshot timezone",
    snapshot.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "snapshot fiscal_start_month",
    snapshot.fiscal_start_month,
    7,
  );
  TestValidator.equals("snapshot status", snapshot.status, "active");
  TestValidator.equals(
    "snapshot metadata",
    snapshot.metadata,
    JSON.stringify({ extendedConfig: { featureFlag: true, theme: "dark" } }),
  );
  TestValidator.predicate(
    "snapshot has valid id",
    snapshot.id !== null && snapshot.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot linked to organization",
    snapshot.hrm_platform_organization_id === organization.id,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    snapshot.created_at !== undefined,
  );
}
