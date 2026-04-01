import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "./ShoppingMallSellerApprovalRequestAtSummaryTransformer";

export namespace ShoppingMallSellerApprovalSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_approval_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        sellerApprovalRequest:
          ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_approval_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApprovalSnapshot> {
    return {
      id: input.id,
      sellerApprovalRequest:
        await ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform(
          input.sellerApprovalRequest,
        ),
      snapshotData: input.snapshot_data,
      createdAt: input.created_at.toISOString(),
    };
  }
}
