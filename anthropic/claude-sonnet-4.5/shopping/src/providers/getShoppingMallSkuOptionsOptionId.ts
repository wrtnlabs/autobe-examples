import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function getShoppingMallSkuOptionsOptionId(props: {
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuOption> {
  const { optionId } = props;

  const option =
    await MyGlobal.prisma.shopping_mall_sku_options.findUniqueOrThrow({
      where: { id: optionId },
      select: {
        id: true,
        option_name: true,
        option_value: true,
      },
    });

  return {
    id: option.id as string & tags.Format<"uuid">,
    option_name: option.option_name,
    option_value: option.option_value,
  };
}
