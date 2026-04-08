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
import { generate_random_hrm_platform_member_organizations_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_organizations_snapshots_create";
import { prepare_random_hrm_platform_organizations_snapshot } from "../../../prepare/prepare_random_hrm_platform_organizations_snapshot";

export async function test_api_organization_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(memberResponse);
  const { member } = memberResponse;
  const organization = memberResponse.member;
  // Create a valid snapshot for the organization
  const validSnapshot =
    await generate_random_hrm_platform_member_organizations_snapshots_create(
      memberConnection,
      {
        body: {
          status: "active",
          currency: (organization as any).currency!,
          name: (organization as any).name,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(validSnapshot);
  const { id: validSnapshotId } = validSnapshot;
  // Test Case 1: Invalid UUID format for snapshotId
  const invalidUuidSnapshotId = "not-a-valid-uuid";
  await TestValidator.error("invalid uuid format returns 404", async () => {
    await api.functional.hrmPlatform.member.organizations.snapshots.at(
      memberConnection,
      {
        organizationId: organization.id,
        snapshotId: invalidUuidSnapshotId,
      },
    );
  });
  // Test Case 2: Valid UUID but non-existent snapshotId
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent snapshot returns 404", async () => {
    await api.functional.hrmPlatform.member.organizations.snapshots.at(
      memberConnection,
      {
        organizationId: organization.id,
        snapshotId: nonExistentSnapshotId,
      },
    );
  });
  // Test Case 3: Valid snapshotId but wrong organizationId
  // Create a second member and organization to use for cross-org test
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberResponse = await authorize_member_join(
    otherMemberConnection,
    {
      body: {
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(otherMemberResponse);
  const otherOrganization = otherMemberResponse.member;
  await TestValidator.error(
    "snapshot from different organization returns 404",
    async () => {
      await api.functional.hrmPlatform.member.organizations.snapshots.at(
        memberConnection,
        {
          organizationId: otherOrganization.id,
          snapshotId: validSnapshotId,
        },
      );
    },
  );
}