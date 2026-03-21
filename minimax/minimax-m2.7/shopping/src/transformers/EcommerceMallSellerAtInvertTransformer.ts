import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerSessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        profile: {
          select: {
            name: true,
            description: true,
            logo_uri: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs,
        adminRequests: true,
        products: true,
        productSnapshots: true,
        shipments: true,
        cancellationRequests: true,
        refundRequests: true,
        refundRequestSnapshots: true,
        sellerApprovals: true,
        sellerSuspensions: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.IInvert> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      approval_status: input.approval_status,
      profile: {
        name: input.profile!.name,
        description: input.profile!.description,
        logo_uri: input.profile!.logo_uri,
      },
    };
  }
}
