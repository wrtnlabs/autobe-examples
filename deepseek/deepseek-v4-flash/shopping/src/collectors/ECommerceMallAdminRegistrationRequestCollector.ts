import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallAdminRegistrationRequestCollector {
  export async function collect(props: {
    body: IECommerceMallAdminRegistrationRequest.ICreate;
    requester_type: "customer" | "seller";
    eCommerceMallCustomers: IEntity;
    eCommerceMallSellers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
    eCommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      requester_type: props.requester_type,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo — no reviewer at creation time
      reviewer: undefined,
      // HasOne — polymorphic subtype: exactly one created based on requester_type
      adminRegistrationRequestCustomer:
        props.requester_type === "customer"
          ? {
              create: {
                id: v4(),
                customer: { connect: { id: props.eCommerceMallCustomers.id } },
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      adminRegistrationRequestSeller:
        props.requester_type === "seller"
          ? {
              create: {
                id: v4(),
                seller: { connect: { id: props.eCommerceMallSellers.id } },
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
    } satisfies Prisma.e_commerce_mall_admin_registration_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallAdminRegistrationRequestCollector {
//         export async function collect(props: {
//           body: IECommerceMallAdminRegistrationRequest.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallSellers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
// eCommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       requester_type: ...,
//       reason: ...,
//       status: ...,
//       rejection_reason: ...,
//       reviewed_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       reviewer: ...,
//       adminRegistrationRequestCustomer: ...,
//       adminRegistrationRequestSeller: ...,
//           } satisfies Prisma.e_commerce_mall_admin_registration_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------