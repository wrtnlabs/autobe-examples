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

export namespace HrmTimeTrackingOrganizationTransformer {
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
  ): Promise<IHrmTimeTrackingOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      status: input.status,
      owner: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmTimeTrackingOrganization;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingOrganizationTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingOrganization> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscal_start_month: {integer},
//   status: {string},
//   owner: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.owner),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------