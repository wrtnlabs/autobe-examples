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

export async function patchShoppingMallSellerInventoryHistory(props: {
  seller: SellerPayload;
}): Promise<void> {
  throw new HttpException(
    "Method Not Allowed: PATCH operations are not supported for inventory history records. Inventory history is an immutable audit trail that records all stock movements. Use POST /sellers/me/inventory for restocking or adjustment operations.",
    405,
  );
}
