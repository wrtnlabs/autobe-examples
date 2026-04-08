import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerProfileTransformer } from "./MallPlatformCustomerProfileTransformer";

export namespace MallPlatformCustomerTransformer {
  export type Payload = Prisma.mall_platform_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: { id: true } },
        passwordResets: { select: { id: true } },
        profile: MallPlatformCustomerProfileTransformer.select(),
        shippingAddresses: { select: { id: true } },
        shoppingCart: { select: { id: true } },
        wishlist: { select: { id: true } },
        orders: { select: { id: true } },
        refundRequests: { select: { id: true } },
        reviews: { select: { id: true } },
        reviewSnapshots: { select: { id: true } },
      },
    } satisfies Prisma.mall_platform_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomer> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      profile: input.profile
        ? await MallPlatformCustomerProfileTransformer.transform(input.profile)
        : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCustomer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCustomerTransformer {
//       export type Payload = Prisma.mall_platform_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             profile: MallPlatformCustomerProfileTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCustomer> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   profile: await MallPlatformCustomerProfileTransformer.transform(input.profile),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------