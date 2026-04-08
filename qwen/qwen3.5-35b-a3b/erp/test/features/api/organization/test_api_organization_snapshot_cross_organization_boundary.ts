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

export async function test_api_organization_snapshot_cross_organization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 with organization1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(member1Authorized);
  const member1OrganizationId = (member1Authorized.member as any).organization!.id;
  // 2. Create snapshot for organization1 using member1's connection
  const snapshotConnection: api.IConnection = { host: connection.host };
  snapshotConnection.headers = {
    Authorization: member1Authorized.token.access,
  };
  const organization1Snapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      snapshotConnection,
      {
        organizationId: member1OrganizationId,
        body: {
          name: (member1Authorized.member as any).organization!.name,
          currency: (member1Authorized.member as any).organization!.currency ?? "USD",
          status: "active",
        } satisfies IHrmPlatformOrganizationsSnapshot.ICreate,
      },
    );
  typia.assert(organization1Snapshot);
  const organization1SnapshotId = organization1Snapshot.id;
  // 3. Create member2 with organization2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(member2Authorized);
  const member2OrganizationId = (member2Authorized.member as any).organization!.id;
  // 4. As member2, attempt to access organization1's snapshot using organization2's context
  const member2AccessConnection: api.IConnection = { host: connection.host };
  member2AccessConnection.headers = {
    Authorization: member2Authorized.token.access,
  };
  // Member2 tries to access snapshot that belongs to organization1
  // This should return 404 or 403 because the snapshot doesn't belong to organization2
  await TestValidator.error(
    "cross-org snapshot access should fail",
    async () => {
      await api.functional.hrmPlatform.member.organizations.snapshots.at(
        member2AccessConnection,
        {
          organizationId: member2OrganizationId,
          snapshotId: organization1SnapshotId,
        },
      );
    },
  );
}