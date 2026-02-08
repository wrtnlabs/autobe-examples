import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
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

export async function getShoppingMallSellerSaleSpecificationsSpecId(props: {
  seller: SellerPayload;
  specId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSpecification> {
  const spec =
    await MyGlobal.prisma.shopping_mall_sale_specifications.findUnique({
      where: { id: props.specId },
    });
  if (!spec) {
    throw new HttpException("Specification not found", 404);
  }
  return spec;
}
