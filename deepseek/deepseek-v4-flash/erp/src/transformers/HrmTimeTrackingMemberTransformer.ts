import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingMemberSessionAtSummaryTransformer } from "./HrmTimeTrackingMemberSessionAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingMemberTransformer {
  export type Payload = Prisma.hrm_time_tracking_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employees: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        sessions: HrmTimeTrackingMemberSessionAtSummaryTransformer.select(),
        ownedOrganizations:
          HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar: input.avatar ?? null,
      phone_number: input.phone_number ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employees: await ArrayUtil.asyncMap(
        input.employees,
        HrmTimeTrackingEmployeeAtSummaryTransformer.transform,
      ),
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        HrmTimeTrackingMemberSessionAtSummaryTransformer.transform,
      ),
      ownedOrganizations: await ArrayUtil.asyncMap(
        input.ownedOrganizations,
        HrmTimeTrackingOrganizationAtSummaryTransformer.transform,
      ),
    } satisfies IHrmTimeTrackingMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingMemberTransformer {
//       export type Payload = Prisma.hrm_time_tracking_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             avatar: true,
//             phone_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ownedOrganizations: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             sessions: HrmTimeTrackingMemberSessionAtSummaryTransformer.select(),
//             employees: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingMember> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   avatar: {string | null},
//   phone_number: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   employees: await ArrayUtil.asyncMap(input.employees, HrmTimeTrackingEmployeeAtSummaryTransformer.transform),
//   sessions: await ArrayUtil.asyncMap(input.sessions, HrmTimeTrackingMemberSessionAtSummaryTransformer.transform),
//   ownedOrganizations: await ArrayUtil.asyncMap(input.ownedOrganizations, HrmTimeTrackingOrganizationAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------