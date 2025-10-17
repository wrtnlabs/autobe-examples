import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

export async function getShoppingMallSkuSizesSizeId(props: {
  sizeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuSize> {
  const { sizeId } = props;

  const size = await MyGlobal.prisma.shopping_mall_sku_sizes.findUniqueOrThrow({
    where: { id: sizeId },
    select: {
      id: true,
      value: true,
    },
  });

  return {
    id: size.id as string & tags.Format<"uuid">,
    value: size.value,
  };
}
