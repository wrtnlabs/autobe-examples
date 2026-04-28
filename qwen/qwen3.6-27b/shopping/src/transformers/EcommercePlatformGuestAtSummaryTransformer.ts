import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformGuestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformGuest.ISummary> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformGuestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             device_fingerprint: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_platform_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformGuest.ISummary> {
//         return {
//   id: {string},
//   device_fingerprint: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------