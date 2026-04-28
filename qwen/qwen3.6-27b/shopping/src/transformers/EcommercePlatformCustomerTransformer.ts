import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerProfileTransformer } from "./EcommercePlatformCustomerProfileTransformer";

export namespace EcommercePlatformCustomerTransformer {
  export type Payload = Prisma.ecommerce_platform_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: EcommercePlatformCustomerProfileTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformCustomer> {
    return {
      id: input.id,
      email: input.email,
      is_banned: input.is_banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer_profile: input.customerProfile
        ? await EcommercePlatformCustomerProfileTransformer.transform(
            input.customerProfile,
          )
        : null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCustomerTransformer {
//       export type Payload = Prisma.ecommerce_platform_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             is_banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customerProfile: EcommercePlatformCustomerProfileTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformCustomer> {
//         return {
//   created_at: {string},
//   customer_profile: input.customerProfile ? await EcommercePlatformCustomerProfileTransformer.transform(input.customerProfile) : null,
//   deleted_at: {string | null},
//   email: {string},
//   id: {string},
//   is_banned: {boolean},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------