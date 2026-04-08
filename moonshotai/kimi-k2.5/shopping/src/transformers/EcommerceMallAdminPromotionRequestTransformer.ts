import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerTransformer } from "./EcommerceMallSellerTransformer";

export namespace EcommerceMallAdminPromotionRequestTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        customerSubtype: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs,
        sellerRequest: {
          select: {
            id: true,
            seller: EcommerceMallSellerTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequest> {
    // Polymorphic requester resolution: customer or seller
    let requester: IEcommerceMallCustomer | IEcommerceMallSeller;
    if (input.customerSubtype) {
      // Inline transform for IEcommerceMallCustomer (DB schema doesn't have address fields in customers table)
      const customerData = input.customerSubtype.customer;
      requester = {
        id: customerData.id,
        recipientName: "",
        phoneNumber: "",
        streetAddress: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        isDefault: false,
        createdAt: customerData.created_at.toISOString(),
        updatedAt: customerData.updated_at.toISOString(),
      } satisfies IEcommerceMallCustomer;
    } else if (input.sellerRequest) {
      requester = await EcommerceMallSellerTransformer.transform(
        input.sellerRequest.seller,
      );
    } else {
      throw new Error(
        "Invalid promotion request: neither customer nor seller requester found",
      );
    }
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      rejectionReason: input.rejection_reason,
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
      requester,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallAdminPromotionRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminPromotionRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_promotion_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminPromotionRequest> {
//         return {
//   id: {string},
//   status: {string},
//   reason: {string},
//   rejectionReason: {string | null},
//   reviewer: input.reviewer ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer) : null,
//   requester: {IEcommerceMallCustomer | IEcommerceMallSeller},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------