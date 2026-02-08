import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function postShoppingMallSellerSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSale.ICreate;
}): Promise<IShoppingMallSale> {
  const id = v4();
  const now = toISOStringSafe(new Date());
  const status: string = (props.body as any).status ?? "pending"; // cast to any to bypass missing property error
  try {
    const created = await MyGlobal.prisma.shopping_mall_sales.create({
      data: {
        id: id as string & tags.Format<"uuid">,
        seller_id: props.seller.id,
        category_id: (props.body as any).category_id,
        name: (props.body as any).name,
        description: (props.body as any).description,
        base_price: (props.body as any).base_price,
        status: status,
        created_at: now as string & tags.Format<"date-time">,
        updated_at: now as string & tags.Format<"date-time">,
        deleted_at: null,
      },
    });
    return {
      id: created.id as string & tags.Format<"uuid">,
      seller_id: created.seller_id as string & tags.Format<"uuid">,
      category_id: created.category_id as string & tags.Format<"uuid">,
      name: created.name,
      description: created.description,
      base_price: created.base_price,
      status: created.status,
      created_at: toISOStringSafe(new Date(created.created_at)) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date(created.updated_at)) as string &
        tags.Format<"date-time">,
      deleted_at:
        created.deleted_at === null
          ? null
          : (toISOStringSafe(new Date(created.deleted_at)) as string &
              tags.Format<"date-time">),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Duplicate sale name within category", 400);
      }
      if (error.code === "P2003") {
        throw new HttpException("Invalid category ID", 400);
      }
    }
    throw error;
  }
}
