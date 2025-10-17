import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSkuSizesSizeId(props: {
  admin: AdminPayload;
  sizeId: string & tags.Format<"uuid">;
  body: IShoppingMallSkuSize.IUpdate;
}): Promise<IShoppingMallSkuSize> {
  const { sizeId, body } = props;

  // Update size - throws if not found
  const updated = await MyGlobal.prisma.shopping_mall_sku_sizes.update({
    where: { id: sizeId },
    data: {
      value: body.value ?? undefined,
    },
  });

  // Return updated size matching IShoppingMallSkuSize structure
  return {
    id: updated.id as string & tags.Format<"uuid">,
    value: updated.value,
  };
}
