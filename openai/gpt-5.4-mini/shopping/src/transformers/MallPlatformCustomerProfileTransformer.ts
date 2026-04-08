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
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";

export namespace MallPlatformCustomerProfileTransformer {
  export type Payload = Prisma.mall_platform_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomerProfile> {
    return {
      id: input.id,
      displayName: input.display_name,
      phoneNumber: input.phone_number,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCustomerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCustomerProfileTransformer {
//       export type Payload = Prisma.mall_platform_customer_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             phone_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_customer_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCustomerProfile> {
//         return {
//   id: {string},
//   displayName: {string},
//   phoneNumber: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------