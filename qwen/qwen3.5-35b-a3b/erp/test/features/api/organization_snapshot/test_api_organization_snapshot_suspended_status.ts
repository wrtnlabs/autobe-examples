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

export async function test_api_organization_snapshot_suspended_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: "KRW",
        org_description: "Test organization",
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: "Asia/Seoul",
        org_fiscal_month: 3,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(joined);
  // 2. Create suspended snapshot
  const snapshotConnection: api.IConnection = { host: connection.host };
  const snapshot: IHrmPlatformOrganizationsSnapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      snapshotConnection,
      {
        organizationId: joined.member.id,
        body: {
          name: "Suspended Corp",
          description: "Organization currently suspended",
          logo_uri: typia.assert<string & tags.MaxLength<80000>>("https://example.com/logo.png"),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
          status: "suspended",
          metadata: undefined,
        } satisfies IHrmPlatformOrganizationsSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot captures suspended status
  TestValidator.equals(
    "snapshot status is suspended",
    snapshot.status,
    "suspended",
  );
  TestValidator.equals(
    "snapshot name matches",
    snapshot.name,
    "Suspended Corp",
  );
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    "Organization currently suspended",
  );
  TestValidator.equals("snapshot currency matches", snapshot.currency, "KRW");
  TestValidator.equals(
    "snapshot timezone matches",
    snapshot.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "snapshot fiscal_start_month matches",
    snapshot.fiscal_start_month,
    3,
  );
  TestValidator.equals(
    "snapshot organization_id matches",
    snapshot.hrm_platform_organization_id,
    joined.member.id,
  );
  // 4. Validate snapshot is immutable point-in-time record
  TestValidator.predicate(
    "snapshot has timestamp",
    snapshot.created_at !== undefined && snapshot.created_at !== null,
  );
  TestValidator.predicate(
    "snapshot timestamp is valid ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.?[0-9]*Z?$/.test(
      snapshot.created_at,
    ),
  );
  // 5. Verify organization reference remains valid
  TestValidator.equals(
    "organization referenced correctly",
    snapshot.hrm_platform_organization_id,
    joined.member.id,
  );
}