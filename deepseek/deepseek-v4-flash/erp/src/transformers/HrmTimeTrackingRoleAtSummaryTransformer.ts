import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingRoleAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        created_at: true,
        updated_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        employees: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs,
      },
    } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      type: input.type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      employees_count: input.employees.filter((e) => e.deleted_at === null)
        .length,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
    } satisfies IHrmTimeTrackingRole.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingRoleAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingRole.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   type: {string},
//   created_at: {string},
//   updated_at: {string},
//   employees_count: {integer},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------