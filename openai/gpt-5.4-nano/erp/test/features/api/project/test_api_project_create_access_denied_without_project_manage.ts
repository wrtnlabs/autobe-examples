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

export async function test_api_project_create_access_denied_without_project_manage(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(24),
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const projectCreateBody: IErpHrmTimeTrackingProject.ICreate = {
    name: RandomGenerator.name(2),
    color: "#" + RandomGenerator.alphabets(6),
    status: "active",
  } satisfies IErpHrmTimeTrackingProject.ICreate;
  await TestValidator.error(
    "project creation should be denied without project manage capability",
    async () => {
      try {
        const output =
          await api.functional.erpHrmTimeTracking.member.projects.create(
            memberConnection,
            { body: projectCreateBody },
          );
        typia.assert(output);
        throw new Error("Project creation unexpectedly succeeded");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        TestValidator.predicate(
          "error should indicate permission/access denial",
          /permission|access|forbidden|denied|unauthorized/i.test(message),
        );
        if (/invalid|validation|format|status/i.test(message)) {
          throw new Error(
            `Expected authorization denial but got possible validation error: ${message}`,
          );
        }
        throw e;
      }
    },
  );
  await TestValidator.error(
    "second project creation should also be denied (no side effects)",
    async () => {
      try {
        const output =
          await api.functional.erpHrmTimeTracking.member.projects.create(
            memberConnection,
            {
              body: {
                ...projectCreateBody,
                name: RandomGenerator.name(3),
              } satisfies IErpHrmTimeTrackingProject.ICreate,
            },
          );
        typia.assert(output);
        throw new Error("Second project creation unexpectedly succeeded");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        TestValidator.predicate(
          "second error should indicate permission/access denial",
          /permission|access|forbidden|denied|unauthorized/i.test(message),
        );
        if (/invalid|validation|format|status/i.test(message)) {
          throw new Error(
            `Expected authorization denial but got possible validation error: ${message}`,
          );
        }
        throw e;
      }
    },
  );
}
