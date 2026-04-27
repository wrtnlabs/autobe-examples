import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingActivityLogTypeTransformer {
  export type Payload = Prisma.hrm_time_tracking_activity_log_typesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        category: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_activity_log_typesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingActivityLogType> {
    return {
      id: input.id,
      code: input.code,
      category: input.category ?? null,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingActivityLogType;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingActivityLogTypeTransformer {
//       export type Payload = Prisma.hrm_time_tracking_activity_log_typesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             category: true,
//             name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.hrm_time_tracking_activity_log_typesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingActivityLogType> {
//         return {
//   id: {string},
//   code: {string},
//   category: {string | null},
//   name: {string},
//   description: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------