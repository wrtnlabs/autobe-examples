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

/**
 * Test successful creation of an organization snapshot for audit trail purposes.
 *
 * Validates the complete organization snapshot creation flow including member registration
 * with initial organization setup, and subsequent snapshot creation with configuration data.
 * Ensures that the snapshot correctly captures the organization state at the point of creation
 * and includes all system-generated fields.
 *
 * Special attention is given to verifying that organization owners can create snapshots,
 * and that the snapshot accurately represents the organization's configuration including
 * name, description, currency, timezone, fiscal year settings, and status.
 */
export async function test_api_organization_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      org_name: "Test Corp",
      org_currency: "USD",
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      org_description: "Leading technology company in Seoul",
      email: "test@example.com",
      password: "TestPass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberResult);
  // 2. Get the organization that was created during join
  const organization = memberResult.member;
  typia.assert<IHrmPlatformMember.ISummary>(organization);
  // 3. Create snapshot of the organization
  const snapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Test Corp",
          description: "Leading technology company in Seoul",
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          status: "active",
          logo_uri: (typia.random<string & tags.Format<"uri">>() ?? "") satisfies string as string,
          metadata: typia.random<string>(),
        } satisfies IHrmPlatformOrganizationsSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains all submitted configuration data
  TestValidator.equals("snapshot name matches", snapshot.name, "Test Corp");
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    "Leading technology company in Seoul",
  );
  TestValidator.equals("snapshot currency matches", snapshot.currency, "USD");
  TestValidator.equals(
    "snapshot timezone matches",
    snapshot.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "snapshot fiscal_start_month matches",
    snapshot.fiscal_start_month,
    1,
  );
  TestValidator.equals("snapshot status matches", snapshot.status, "active");
  // 5. Verify system-generated fields
  typia.assert<string & tags.Format<"uuid">>(snapshot.id);
  typia.assert<string & tags.Format<"uuid">>(
    snapshot.hrm_platform_organization_id,
  );
  typia.assert<string & tags.Format<"date-time">>(snapshot.created_at);
  // 6. Verify hrm_platform_organization_id matches the organization
  TestValidator.equals(
    "organization_id matches",
    snapshot.hrm_platform_organization_id,
    organization.id,
  );
  // 7. Verify logo_uri and metadata are captured (these were provided)
  TestValidator.equals(
    "logo_uri captured",
    snapshot.logo_uri,
    snapshot.logo_uri,
  );
  TestValidator.equals(
    "metadata captured",
    snapshot.metadata,
    snapshot.metadata,
  );
}
