import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";

export namespace HrmTimeTrackingOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        status: true,
        created_at: true,
        updated_at: true,
        owner: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      status: input.status,
      owner: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.owner,
      ),
    } satisfies IHrmTimeTrackingOrganization.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingOrganizationAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_organizationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             owner: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_organizationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingOrganization.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscal_start_month: {integer},
//   status: {string},
//   owner: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.owner),
//         };
//       }
//     }
//--------------------------------------------------------------