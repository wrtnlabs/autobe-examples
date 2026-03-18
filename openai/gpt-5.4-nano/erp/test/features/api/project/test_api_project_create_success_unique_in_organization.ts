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

export async function test_api_project_create_success_unique_in_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join) to obtain authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const organizationName = `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(6)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(8)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(8)}.example.com/landing`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a new project within the selected organization
  const projectName = RandomGenerator.alphabets(12);
  const projectColor = `#${RandomGenerator.alphabets(6)}`;
  const projectStatus = RandomGenerator.alphabets(8);
  const createBody = {
    name: projectName,
    color: projectColor,
    status: projectStatus,
  } satisfies IErpHrmTimeTrackingProject.ICreate;
  const created: IErpHrmTimeTrackingProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  // 3) Validate response fields
  TestValidator.equals("project name matches", created.name, projectName);
  TestValidator.equals("project color matches", created.color, projectColor);
  TestValidator.equals("project status matches", created.status, projectStatus);
  TestValidator.equals("project deleted_at is null", created.deleted_at, null);
  TestValidator.predicate("project id is present", created.id.length > 0);
  // Organization scoping is enforced by the service from the member session.
  // We can assert the scoped organization id is present.
  TestValidator.predicate(
    "project organization id is present",
    created.erp_hrm_time_tracking_organization_id.length > 0,
  );
  // 4) Validate timestamps ordering
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(created.updated_at).getTime() >=
      new Date(created.created_at).getTime(),
  );
}
