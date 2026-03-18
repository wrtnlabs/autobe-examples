import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_create_conflict_duplicate_name_same_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth as member (join) to get tokens and an organization context
  const memberBaseConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password_1234!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberBaseConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  // 2) Create project A
  const projectName = RandomGenerator.alphabets(12);
  const projectColorA = "#" + RandomGenerator.alphabets(6);
  const projectStatusA = typia.random<string>();
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: projectName,
          color: projectColorA,
          status: projectStatusA,
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  // 3) Attempt to create project B with same name in the same organization
  const projectColorB = "#" + RandomGenerator.alphabets(6);
  // Keep status the same to avoid relying on unknown allowed status values.
  const projectStatusB = projectA.status;
  await TestValidator.error(
    "create project should conflict on duplicate name within same organization",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_projects_create(
        memberConnection,
        {
          body: {
            name: projectName,
            color: projectColorB,
            status: projectStatusB,
          } satisfies IErpHrmTimeTrackingProject.ICreate,
        },
      );
    },
  );
  // 4) Logical validation: first project remains valid
  TestValidator.equals(
    "first project has expected name",
    projectA.name,
    projectName,
  );
}
