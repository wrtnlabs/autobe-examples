import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformActivityLogDetailTransformer {
  export type Payload = Prisma.hrm_platform_activity_log_detailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_platform_activity_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLogDetail> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPlatformActivityLogDetail;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformActivityLogDetailTransformer {
//       export type Payload = Prisma.hrm_platform_activity_log_detailsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             value: true,
//             created_at: true,
//             updated_at: true,
//             hrm_platform_activity_log_id: true,
//           },
//         } satisfies Prisma.hrm_platform_activity_log_detailsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformActivityLogDetail> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------