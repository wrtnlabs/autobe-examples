import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_assigned_projects_soft_deleted_exclusion_and_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
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
  await authorize_member_join(memberConnection, { body: joinPayload });
  const current = 1;
  const limit = 10;
  const reqBody = {
    pagination: {
      current,
      limit,
    },
  } satisfies IErpHrmTimeTrackingProjectMembership.IRequest;
  const first =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: reqBody },
    );
  typia.assert(first);
  for (const project of first.data) {
    TestValidator.equals(
      "assigned project should be active (deleted_at null)",
      project.deleted_at,
      null,
    );
  }
  const second =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: reqBody },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current remains valid",
    second.pagination.current,
    current,
  );
  TestValidator.equals(
    "pagination limit remains valid",
    second.pagination.limit,
    limit,
  );
  if (second.data.length > 0) {
    for (const project of second.data) {
      TestValidator.equals(
        "assigned project should be active (deleted_at null)",
        project.deleted_at,
        null,
      );
      TestValidator.predicate(
        "project status should be non-empty",
        project.status.length > 0,
      );
    }
  }
}
