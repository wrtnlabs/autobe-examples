import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallUserBanCollector {
  export async function collect(props: {
    body: IEcommerceMallUserBan.ICreate;
    administrator: IEntity;
  }) {
    const id: string = v4();
    const user_type: string = props.body.user_type;
    return {
      id,
      user_type,
      reason: props.body.reason,
      banned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      administrator: { connect: { id: props.administrator.id } },
      customerBan:
        user_type === "customer" && props.body.customer_id
          ? {
              connectOrCreate: {
                where: { id: props.body.customer_id },
                create: {
                  id: props.body.customer_id,
                  created_at: new Date(),
                  updated_at: new Date(),
                  customer: { connect: { id: props.body.customer_id } },
                },
              },
            }
          : undefined,
      sellerBan:
        user_type === "seller" && props.body.seller_id
          ? {
              connectOrCreate: {
                where: { id: props.body.seller_id },
                create: {
                  id: props.body.seller_id,
                  created_at: new Date(),
                  updated_at: new Date(),
                  seller: { connect: { id: props.body.seller_id } },
                },
              },
            }
          : undefined,
    } satisfies Prisma.ecommerce_mall_user_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallUserBanCollector {
//         export async function collect(props: {
//           body: IEcommerceMallUserBan.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       user_type: ...,
//       reason: ...,
//       banned_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       administrator: ...,
//       customerBan: ...,
//       sellerBan: ...,
//           } satisfies Prisma.ecommerce_mall_user_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------