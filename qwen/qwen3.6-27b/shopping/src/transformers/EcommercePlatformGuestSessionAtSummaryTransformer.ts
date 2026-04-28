import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformGuestAtSummaryTransformer } from "./EcommercePlatformGuestAtSummaryTransformer";

export namespace EcommercePlatformGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        guest: EcommercePlatformGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformGuestSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await EcommercePlatformGuestAtSummaryTransformer.transform(
        input.guest,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformGuestSessionAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_guest_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             guest: EcommercePlatformGuestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformGuestSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//   guest: await EcommercePlatformGuestAtSummaryTransformer.transform(input.guest),
//         };
//       }
//     }
//--------------------------------------------------------------