import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        approval_status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: false,
        emailVerifications: false,
        passwordResets: false,
        profileSnapshots: false,
        products: false,
        sales: false,
        saleQuestionAnswers: false,
        refundRequests: false,
        shipments: false,
        notificationPreferences: false,
        sellerApproval: false,
        bannedUser: false,
        sellerSuspensions: false,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoUri: input.logo_uri ?? null,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason ?? null,
    };
  }
}
