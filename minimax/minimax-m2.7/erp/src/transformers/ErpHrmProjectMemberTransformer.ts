import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "./ErpHrmTimelogAtSummaryTransformer";
import { ErpHrmTimerAtSummaryTransformer } from "./ErpHrmTimerAtSummaryTransformer";

export namespace ErpHrmProjectMemberTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            projectMemberships: true,
            tasks: true,
            timelogs: true,
            timers: true,
          },
        },
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        projectMemberships: {
          select: {
            id: true,
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                organization: ErpHrmOrganizationAtSummaryTransformer.select(),
                _count: {
                  select: {
                    projectMemberships: true,
                    tasks: true,
                    timelogs: true,
                    timers: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
        tasks: ErpHrmTaskAtSummaryTransformer.select(),
        timelogs: ErpHrmTimelogAtSummaryTransformer.select(),
        timers: ErpHrmTimerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      color: input.color,
      status: input.status,
      budget_hours: input.budget_hours ?? undefined,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      project_members_count: input._count.projectMemberships,
      projectMemberships: await ArrayUtil.asyncMap(
        input.projectMemberships,
        async (pm) => ({
          id: pm.project.id,
          name: pm.project.name,
          color: pm.project.color,
          status: pm.project.status,
          budget_hours: pm.project.budget_hours ?? undefined,
          start_date: pm.project.start_date?.toISOString() ?? null,
          end_date: pm.project.end_date?.toISOString() ?? null,
          created_at: pm.project.created_at.toISOString(),
          organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
            pm.project.organization,
          ),
        }),
      ),
      tasks_count: input._count.tasks,
      tasks: await ArrayUtil.asyncMap(
        input.tasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        ErpHrmTimelogAtSummaryTransformer.transform,
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        ErpHrmTimerAtSummaryTransformer.transform,
      ),
    };
  }
}
