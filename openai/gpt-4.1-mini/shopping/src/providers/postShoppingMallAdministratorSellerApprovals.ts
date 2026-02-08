import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerApprovalCollector } from "../collectors/ShoppingMallSellerApprovalCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApproval.ICreate;
}): Promise<IShoppingMallSellerApproval> {
  // Verify that the seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: (props.body as any).shopping_mall_seller_id as string },
  });
  if (!seller) throw new HttpException("Seller not found", 404);
  // Check if an approval record already exists for this seller and is not deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findFirst({
      where: {
        shopping_mall_seller_id: (props.body as any)
          .shopping_mall_seller_id as string,
        deleted_at: null,
      },
    });
  if (existing)
    throw new HttpException(
      "Approval record already exists for this seller",
      409,
    );
  // Prepare the createInput using the collector
  const createInput = await ShoppingMallSellerApprovalCollector.collect({
    body: props.body,
    seller,
  });
  // Create a new seller approval record
  const created = await MyGlobal.prisma.shopping_mall_seller_approvals.create({
    data: createInput,
  });
  // Return the created record with all dates converted to string with date-time format
  return {
    id: created.id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    status: created.status,
    rejection_reason:
      created.rejection_reason === null ? null : created.rejection_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
