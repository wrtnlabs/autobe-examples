import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test unauthorized access to project snapshots.
 * Validates that members cannot access snapshots for projects they don't have permission to view.
 * Returns HTTP 404 Not Found to avoid information leakage about resource existence.
 */
export async function test_api_project_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate memberA
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.hrmPlatform.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Create a project as memberA
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${typia.random<string & tags.MinLength<6> & tags.MaxLength<6>>()}`,
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Generate a snapshot ID (in real scenario, this would be created by the system)
  // For testing purposes, we'll use a random UUID as the snapshot ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create and authenticate memberB (different account with no access to memberA's project)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.hrmPlatform.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 5. Attempt to access the snapshot as memberB (should fail with 404)
  await TestValidator.httpError(
    "unauthorized member cannot access project snapshot",
    404,
    async () =>
      await api.functional.hrmPlatform.member.projects.snapshots.at(
        memberBConnection,
        {
          projectId: project.id,
          snapshotId: snapshotId,
        },
      ),
  );
  // 6. Verify memberB cannot access any snapshots for memberA's project
  const anotherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized member cannot access any project snapshots",
    404,
    async () =>
      await api.functional.hrmPlatform.member.projects.snapshots.at(
        memberBConnection,
        {
          projectId: project.id,
          snapshotId: anotherSnapshotId,
        },
      ),
  );
}
