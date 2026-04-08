import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmProjectAtSummaryTransformer {
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
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        projectMemberships: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
        tasks: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        timelogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timers: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color: input.color,
      status: input.status,
      budgetHours:
        input.budget_hours != null ? Number(input.budget_hours) : null,
      createdAt: input.created_at.toISOString(),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      totalTimelogsCount: input.timelogs.length,
    } satisfies IErpHrmProject.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color: true,
//             status: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             organization: ErpHrmOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProject.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   color: {string},
//   status: {string},
//   budgetHours: {number | null},
//   createdAt: {string},
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//   totalTimelogsCount: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------