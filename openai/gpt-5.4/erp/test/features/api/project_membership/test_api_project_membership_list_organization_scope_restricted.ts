import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_membership_list_organization_scope_restricted(
  connection: api.IConnection,
): Promise<void> {
  const scopedConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const body = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    membership_role: RandomGenerator.pick(["member", "project-lead"] as const),
    sort: RandomGenerator.pick([
      "+created_at",
      "-created_at",
      "+updated_at",
      "-updated_at",
      "+membership_role",
      "-membership_role",
    ] as const),
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingProjectMembership.IRequest;
  await TestValidator.httpError(
    "organization-scoped membership list blocks inaccessible project",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.index(
        scopedConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
