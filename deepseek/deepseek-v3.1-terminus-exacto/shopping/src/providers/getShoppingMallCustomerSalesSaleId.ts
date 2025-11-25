import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerSalesSaleId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSale> {
  // Find the sale with proper customer ownership validation
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      id: props.saleId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException(
      "Sale not found or you don't have permission to access this sale",
      404,
    );
  }

  // Convert all Date fields to ISO strings and return the complete sale object
  return {
    id: sale.id,
    shopping_mall_order_id: sale.shopping_mall_order_id,
    sale_amount: sale.sale_amount,
    item_count: sale.item_count,
    sale_status: sale.sale_status,
    commission_rate: sale.commission_rate,
    net_amount: sale.net_amount,
    sale_date: toISOStringSafe(sale.sale_date),
    created_at: toISOStringSafe(sale.created_at),
    updated_at: toISOStringSafe(sale.updated_at),
  };
}
