import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemProductSnapshot";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdProductSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemProductSnapshot.ISummary> {
  // Verify order item exists and belongs to customer's order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      order: {
        customer_id: props.customer.id,
      },
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  // Build where conditions for product snapshots
  const whereInput: Prisma.ecommerce_mall_order_item_product_snapshotsWhereInput =
    {
      order_item_id: props.itemId,
    };
  if (props.body.search !== null) {
    whereInput.name = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.createdAtFrom !== null || props.body.createdAtTo !== null) {
    whereInput.created_at = {};
    if (props.body.createdAtFrom !== null) {
      whereInput.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== null) {
      whereInput.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query product snapshots with category
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        category_name: true,
        base_price: true,
        created_at: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            parent_id: true,
          },
        },
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.count({
      where: whereInput,
    });
  // Transform to DTO format
  const data: IEcommerceMallOrderItemProductSnapshot.ISummary[] = snapshots.map(
    (snapshot) => {
      const categoryData = snapshot.category;
      const parentReference: IParentReference | null =
        categoryData !== null && categoryData.parent_id !== null
          ? { id: categoryData.parent_id }
          : null;
      const categorySummary: IEcommerceMallCategory.ISummary | null =
        categoryData === null
          ? null
          : {
              id: categoryData.id,
              name: categoryData.name,
              description: categoryData.description,
              createdAt: toISOStringSafe(categoryData.created_at),
              parent: parentReference,
            };
      return {
        id: snapshot.id,
        name: snapshot.name,
        categoryName: snapshot.category_name,
        basePrice: snapshot.base_price,
        createdAt: toISOStringSafe(snapshot.created_at),
        category: categorySummary,
      };
    },
  );
  // Build pagination
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data,
    pagination,
  };
}
