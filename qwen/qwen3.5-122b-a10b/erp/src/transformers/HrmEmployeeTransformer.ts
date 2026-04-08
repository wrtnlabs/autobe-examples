import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmEmployeeTransformer {
  export type Payload = Prisma.hrm_membersGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: {} },
        passwordResets: { select: {} },
        emailVerifications: { select: {} },
        organizationOwners: { select: {} },
        employee: { select: {} },
        sentInvitations: { select: {} },
        receivedInvitation: { select: {} },
        employeeSnapshots: { select: {} },
        taskHistories: { select: {} },
        reviewedTimesheets: { select: {} },
        activityLogs: { select: {} },
      },
    } satisfies Prisma.hrm_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmEmployee> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmEmployee;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmEmployeeTransformer {
//       export type Payload = Prisma.hrm_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.hrm_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmEmployee> {
//         return {
//   id: {string},
//   email: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------