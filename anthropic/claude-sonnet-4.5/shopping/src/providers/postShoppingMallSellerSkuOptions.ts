import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSkuOptions(props: {
  seller: SellerPayload;
  body: IShoppingMallSkuOption.ICreate;
}): Promise<IShoppingMallSkuOption> {
  const { seller, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.shopping_mall_sku_options.create({
      data: {
        id,
        option_name: body.option_name,
        option_value: body.option_value,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      option_name: created.option_name,
      option_value: created.option_value,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "SKU option with this name and value combination already exists",
          409,
        );
      }
    }
    throw error;
  }
}
