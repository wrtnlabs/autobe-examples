import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_deletion_permission_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member (creates organization as owner)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmsMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Get organization from member's memberships
  const firstOrg = authorized.organization_memberships[0]?.organization;
  TestValidator.notEquals("has organization", firstOrg, undefined);
  // 2. Create a project as the owner
  const createdProject =
    await api.functional.hrms.member.organizations.projects.create(
      joinConnection,
      {
        organizationId: firstOrg!.id,
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(createdProject);
  // 3. Join as another user (member without project:manage permission)
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmsMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberAuthorized);
  // 4. Member attempts to delete a project they don't have permission for
  const deleteConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "member without project:manage permission cannot delete project",
    [403, 404],
    async () => {
      await api.functional.hrms.member.projects.erase(deleteConnection, {
        projectId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
