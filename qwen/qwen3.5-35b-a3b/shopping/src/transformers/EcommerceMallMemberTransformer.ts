import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallMemberTransformer {
  export type Payload = Prisma.ecommerce_mall_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      phone_number: input.phone_number,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallMemberTransformer {
//       export type Payload = Prisma.ecommerce_mall_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             phone_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallMember> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string | null},
//   phone_number: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------