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

export async function putShoppingMallSellerSkuOptionsOptionId(props: {
  seller: SellerPayload;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallSkuOption.IUpdate;
}): Promise<IShoppingMallSkuOption> {
  const { optionId, body } = props;

  const updated = await MyGlobal.prisma.shopping_mall_sku_options.update({
    where: { id: optionId },
    data: {
      option_value: body.option_value ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    option_name: updated.option_name,
    option_value: updated.option_value,
  };
}
