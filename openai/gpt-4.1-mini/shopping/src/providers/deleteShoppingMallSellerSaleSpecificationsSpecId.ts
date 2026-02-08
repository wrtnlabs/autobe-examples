import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerSaleSpecificationsSpecId(props: {
  seller: SellerPayload;
  specId: string & tags.Format<"uuid">;
}): Promise<void> {
  const spec =
    await MyGlobal.prisma.shopping_mall_sale_specifications.findUnique({
      where: { id: props.specId },
    });
  if (!spec) {
    throw new HttpException("Sale specification not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_sale_specifications.delete({
    where: { id: props.specId },
  });
}
