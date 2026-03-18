import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "./ShoppingMallSellerApprovalRequestAtSummaryTransformer";

export namespace ShoppingMallSellerApprovalRequestReviewTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_approval_request_reviewsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sellerApprovalRequest:
          ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        decision: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_approval_request_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApprovalRequestReview> {
    return {
      id: input.id,
      sellerApprovalRequest:
        await ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform(
          input.sellerApprovalRequest,
        ),
      administrator:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      decision: input.decision,
      reviewedAt: input.reviewed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
