import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
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

export async function postShoppingMallCustomerSaleFavoritesToggle(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.IToggle;
}): Promise<IShoppingMallSaleFavorite.IToggle> {
  const saleId = typia.assert<string & tags.Format<"uuid">>(
    (props.body as any).saleId,
  );
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: saleId },
  });
  if (sale === null) {
    throw new HttpException("Sale not found", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const favorite = await prisma.shopping_mall_sale_favorites.findUnique({
      where: {
        shopping_mall_customer_id_shopping_mall_sale_id: {
          shopping_mall_customer_id: props.customer.id,
          shopping_mall_sale_id: saleId,
        },
      },
    });
    if (favorite !== null) {
      await prisma.shopping_mall_sale_favorites.delete({
        where: {
          shopping_mall_customer_id_shopping_mall_sale_id: {
            shopping_mall_customer_id: props.customer.id,
            shopping_mall_sale_id: saleId,
          },
        },
      });
      return { saleId, favorited: false };
    } else {
      await prisma.shopping_mall_sale_favorites.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_customer_id: props.customer.id,
          shopping_mall_sale_id: saleId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      return { saleId, favorited: true };
    }
  });
}
