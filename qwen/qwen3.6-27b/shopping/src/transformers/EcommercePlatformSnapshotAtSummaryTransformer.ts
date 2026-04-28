import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshot.ISummary> {
    return {
      id: input.id,
      entityType: input.entity_type,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommercePlatformSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             entity_type: true,
//             created_at: true,
//           },
//         } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshot.ISummary> {
//         return {
//   id: {string},
//   entityType: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------