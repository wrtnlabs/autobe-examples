import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrderItemsOrderItemIdSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
      },
    });
  const snapshots =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: {
        shopping_mall_order_item_id: orderItem.id,
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        product_name: true,
        product_description: true,
        variant_sku: true,
        variant_option_values: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_image: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
      },
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
      where: {
        shopping_mall_order_item_id: orderItem.id,
      },
    });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      orderItem: {
        id: orderItem.id,
        order: {
          id: orderItem.shopping_mall_order_id,
          order_number: "",
          status: "",
          subtotal_amount: 0,
          shipping_fee_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          placed_at: new Date(0).toISOString(),
          paid_at: null,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          deleted_at: null,
          customer: {
            id: props.seller.id,
            email: "",
            accountStatus: "",
            bannedAt: null,
            deletedAt: null,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
          shippingAddress: null,
        },
        productVariant: {
          id: "00000000-0000-0000-0000-000000000000",
          skuCode: snapshot.variant_sku,
          overridePrice: null,
          stockQuantity: snapshot.quantity,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
        quantity: snapshot.quantity,
        status: "",
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        refundedAt: null,
        createdAt: snapshot.created_at.toISOString(),
        updatedAt: snapshot.created_at.toISOString(),
        deletedAt: null,
      },
      productName: snapshot.product_name,
      productDescription: snapshot.product_description,
      variantSku: snapshot.variant_sku,
      variantOptionValues: snapshot.variant_option_values,
      sellerShopName: snapshot.seller_shop_name,
      sellerShopDescription: snapshot.seller_shop_description,
      sellerLogoImage: snapshot.seller_logo_image,
      quantity: snapshot.quantity,
      unitPrice: snapshot.unit_price,
      totalPrice: snapshot.total_price,
      createdAt: snapshot.created_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
