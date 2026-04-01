import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "./ShoppingMallSellerApprovalRequestAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerApprovalRequestSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_approval_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        request: ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApprovalRequestSnapshot> {
    return {
      id: input.id,
      status: input.status,
      rejection_reason: input.rejection_reason,
      reviewed_at: input.reviewed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      request:
        await ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform(
          input.request,
        ),
      administrator: input.administrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
      seller: input.seller
        ? await ShoppingMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
    };
  }
}
