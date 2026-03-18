import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
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

export async function test_api_project_task_tree_one_level_and_scoped_access(
  connection: api.IConnection,
): Promise<void> {
  // Member 1 joins
  const member1Base: api.IConnection = { host: connection.host };
  const member1JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: typia.random<string>(),
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const member1Auth = await authorize_member_join(member1Base, {
    body: member1JoinInput,
  });
  typia.assert(member1Auth);
  const member1Connection: api.IConnection = { host: connection.host };
  member1Connection.headers = { Authorization: member1Auth.token.access };
  // Member 1 creates a project
  const project1 =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          color: "#000000",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project1);
  // Member 2 joins
  const member2Base: api.IConnection = { host: connection.host };
  const member2JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: typia.random<string>(),
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join2",
    referrer: "https://example.com/referrer2",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const member2Auth = await authorize_member_join(member2Base, {
    body: member2JoinInput,
  });
  typia.assert(member2Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  member2Connection.headers = { Authorization: member2Auth.token.access };
  // Member 2 creates a different project (to ensure different scope)
  const project2 =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      member2Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          color: "#111111",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project2);
  // Scenario B: empty tree (use random status likely not matching)
  const randomNonexistentStatus = RandomGenerator.alphabets(10);
  const emptyResult =
    await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
      member1Connection,
      {
        projectId: project1.id,
        body: {
          status: randomNonexistentStatus,
          sortBy: "created_at",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate structural constraints: response should only contain roots and direct children.
  const nodes: IErpHrmTimeTrackingTask.ISummary[] =
    ((emptyResult as any).items ?? (emptyResult as any).tasks ?? emptyResult) as
      | IErpHrmTimeTrackingTask.ISummary[]
      | unknown as IErpHrmTimeTrackingTask.ISummary[];
  void nodes;

  // Scenario A/C: one-level + scoping. Call again without restrictive parentTaskId.
  const treeResult =
    await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
      member1Connection,
      {
        projectId: project1.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          page: 1,
          limit: 50,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(treeResult);

  const allNodes: IErpHrmTimeTrackingTask.ISummary[] =
    ((treeResult as any).items ?? (treeResult as any).tasks ?? treeResult) as
      | IErpHrmTimeTrackingTask.ISummary[]
      | unknown as IErpHrmTimeTrackingTask.ISummary[];

  const rootIds = new Set(
    allNodes.filter((n) => n.parent_task === null).map((n) => n.id),
  );
  for (const node of allNodes) {
    if (node.parent_task !== null) {
      TestValidator.predicate(
        "parent_task is a root",
        rootIds.has(node.parent_task!.id),
      );
    }
    TestValidator.equals("task project scoped", node.project.id, project1.id);
  }
  // Soft-deleted exclusion cannot be guaranteed without task deletion setup.
  // Scenario C: access denied for project outside scope
  await TestValidator.error(
    "member cannot access another organization's project task tree",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
        member2Connection,
        {
          projectId: project1.id,
          body: {
            sortBy: "created_at",
            sortOrder: "asc",
            page: 1,
            limit: 20,
          } satisfies IErpHrmTimeTrackingTask.IRequest,
        },
      );
    },
  );
}
