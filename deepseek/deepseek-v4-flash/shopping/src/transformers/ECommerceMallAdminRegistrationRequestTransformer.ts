import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";
import { ECommerceMallSuperAdministratorAtSummaryTransformer } from "./ECommerceMallSuperAdministratorAtSummaryTransformer";

export namespace ECommerceMallAdminRegistrationRequestTransformer {
  export type Payload =
    Prisma.e_commerce_mall_admin_registration_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        requester_type: true,
        reason: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
        adminRegistrationRequestCustomer: {
          select: {
            customer: ECommerceMallCustomerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.e_commerce_mall_admin_registration_request_customersFindManyArgs,
        adminRegistrationRequestSeller: {
          select: {
            seller: ECommerceMallSellerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.e_commerce_mall_admin_registration_request_sellersFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_admin_registration_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallAdminRegistrationRequest> {
    return {
      id: input.id,
      requester_type: input.requester_type,
      reason: input.reason,
      status: input.status,
      rejection_reason: input.rejection_reason ?? null,
      reviewer:
        input.reviewer !== null
          ? await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(
              input.reviewer,
            )
          : null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      requester:
        input.requester_type === "customer"
          ? await ECommerceMallCustomerAtSummaryTransformer.transform(
              input.adminRegistrationRequestCustomer!.customer,
            )
          : await ECommerceMallSellerAtSummaryTransformer.transform(
              input.adminRegistrationRequestSeller!.seller,
            ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallAdminRegistrationRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdminRegistrationRequestTransformer {
//       export type Payload = Prisma.e_commerce_mall_admin_registration_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             requester_type: true,
//             reason: true,
//             status: true,
//             rejection_reason: true,
//             reviewed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reviewer: ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_admin_registration_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallAdminRegistrationRequest> {
//         return {
//   id: {string},
//   requester_type: {string},
//   reason: {string},
//   status: {string},
//   rejection_reason: {string | null},
//   reviewer: input.reviewer ? await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(input.reviewer) : null,
//   reviewed_at: {string | null},
//   requester: {IECommerceMallCustomer.ISummary | IECommerceMallSeller.ISummary},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------