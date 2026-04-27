import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color_code: true,
        status: true,
        budget_hours: true,
        started_at: true,
        ended_at: true,
        created_at: true,
        updated_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      colorCode: input.color_code,
      status: input.status,
      budgetHours: input.budget_hours ?? null,
      startedAt: input.started_at?.toISOString() ?? null,
      endedAt: input.ended_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
    } satisfies IHrmTimeTrackingProject.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingProjectAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             status: true,
//             budget_hours: true,
//             started_at: true,
//             ended_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingProject.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   colorCode: {string},
//   status: {string},
//   budgetHours: {number | null},
//   startedAt: {string | null},
//   endedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------