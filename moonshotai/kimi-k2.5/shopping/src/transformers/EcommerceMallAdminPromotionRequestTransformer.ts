import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
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
            customer: {
              select: {
                id: true,
                email: true,
                password_hash: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs,
        sellerRequest: {
          select: {
            seller: EcommerceMallSellerTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequest> {
    let requester: IEcommerceMallCustomer | IEcommerceMallSeller;
    if (input.customerSubtype?.customer) {
      const customer = input.customerSubtype.customer;
      requester = {
        id: customer.id,
        recipientName: "",
        phoneNumber: "",
        streetAddress: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        isDefault: false,
        createdAt: customer.created_at.toISOString(),
        updatedAt: customer.updated_at.toISOString(),
      };
    } else if (input.sellerRequest?.seller) {
      requester = await EcommerceMallSellerTransformer.transform(
        input.sellerRequest.seller,
      );
    } else {
      throw new Error(
        "Neither customer nor seller found for promotion request",
      );
    }
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      rejectionReason: input.rejection_reason ?? null,
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
      requester,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
