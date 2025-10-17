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

export async function postShoppingMallAdminSkuSizes(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuSize.ICreate;
}): Promise<IShoppingMallSkuSize> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_sku_sizes.create({
    data: {
      id: newId,
      value: body.value,
      category: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: newId,
    value: created.value,
  };
}
