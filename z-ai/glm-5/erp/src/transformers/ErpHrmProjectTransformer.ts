import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmProjectTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        tasks: {
          where: { deleted_at: null },
          select: ErpHrmTaskAtSummaryTransformer.select().select,
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        _count: {
          select: {
            timelogs: true,
            projectMembers: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmProject> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      colorCode: input.color_code,
      status: input.status,
      budgetHours: input.budget_hours,
      startDate: input.start_date ? input.start_date.toISOString() : null,
      endDate: input.end_date ? input.end_date.toISOString() : null,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      tasks: await ArrayUtil.asyncMap(
        input.tasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      timelogsCount: input._count.timelogs,
      membersCount: input._count.projectMembers,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
