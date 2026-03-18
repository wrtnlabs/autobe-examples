import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_activity_log_retrieval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with org:manage permission (owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create a project (this generates an activity log entry with action_type 'project.created')
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: typia.random<string>(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Retrieve activity log by ID
  // Note: In a complete test suite, we would first call the activity logs list endpoint
  // to get the actual activity log ID created by the project creation action.
  // Since only the 'at' endpoint is available in the provided functions, this test
  // demonstrates the retrieval pattern. The actual activity log ID would be obtained
  // from: api.functional.hrmPlatform.member.activity_logs.list(memberConnection, {...})
  // For this test, we use a valid UUID format to test the endpoint structure.
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId: activityLogId,
    },
  );
  typia.assert(activityLog);
  // 5. Validate business logic: member information matches the authenticated member
  TestValidator.equals(
    "member id matches",
    activityLog.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches",
    activityLog.member.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member display_name matches",
    activityLog.member.display_name,
    memberAuth.displayName,
  );
  // 6. Validate business logic: organization information matches current context
  TestValidator.equals(
    "organization id matches",
    activityLog.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    activityLog.organization.name,
    organization.name,
  );
  // 7. Validate business logic: action_type follows naming convention (entity.action pattern)
  TestValidator.predicate(
    "action_type follows entity.action pattern",
    activityLog.action_type.split(".").length === 2,
  );
  // 8. Validate business logic: target_entity_id is a valid reference
  TestValidator.predicate(
    "target_entity_id is non-empty",
    activityLog.target_entity_id.length > 0,
  );
  TestValidator.predicate(
    "target_entity_type is non-empty",
    activityLog.target_entity_type.length > 0,
  );
}
