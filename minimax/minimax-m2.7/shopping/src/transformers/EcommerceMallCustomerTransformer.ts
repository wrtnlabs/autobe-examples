import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerProfileAtSummaryTransformer } from "./EcommerceMallCustomerProfileAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";

export namespace EcommerceMallCustomerTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceMallCustomerProfileAtSummaryTransformer.select(),
        shippingAddresses:
          EcommerceMallShippingAddressAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
      addresses: await ArrayUtil.asyncMap(
        input.shippingAddresses,
        EcommerceMallShippingAddressAtSummaryTransformer.transform,
      ),
    } satisfies IEcommerceMallCustomer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerTransformer {
//       export type Payload = Prisma.ecommerce_mall_customersGetPayload<ReturnType<typeof select>>;
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
//             shippingAddresses: EcommerceMallShippingAddressAtSummaryTransformer.select(),
//             profile: EcommerceMallCustomerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomer> {
//         return {
//   addresses: await ArrayUtil.asyncMap(input.shippingAddresses, EcommerceMallShippingAddressAtSummaryTransformer.transform),
//   created_at: {string},
//   deleted_at: {null | string},
//   email: {string},
//   id: {string},
//   profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(input.profile),
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------