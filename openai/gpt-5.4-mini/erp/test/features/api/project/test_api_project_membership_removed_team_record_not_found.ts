import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_removed_team_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId },
        body: {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const read = await api.functional.erpHrmTime.member.projects.memberships.at(
    memberConnection,
    {
      projectId,
      membershipId: membership.id,
    },
  );
  typia.assert(read);
  TestValidator.equals("membership id", read.id, membership.id);
  TestValidator.equals(
    "project role",
    read.projectRole,
    membership.projectRole,
  );
  TestValidator.equals(
    "created timestamp",
    read.createdAt,
    membership.createdAt,
  );
  TestValidator.equals(
    "updated timestamp",
    read.updatedAt,
    membership.updatedAt,
  );
  TestValidator.equals(
    "deleted timestamp",
    read.deletedAt,
    membership.deletedAt,
  );
  await TestValidator.httpError(
    "missing membership should not be found",
    404,
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.at(
        memberConnection,
        {
          projectId,
          membershipId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
