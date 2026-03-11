import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorVariantsVariantIdInventoryRecordId(props: {
  administrator: AdministratorPayload;
  variantId: string;
  recordId: string;
}): Promise<IShoppingMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.recordId },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  if (record.variant.id !== props.variantId) {
    throw new HttpException("Record not found for this variant", 404);
  }
  return await ShoppingMallInventoryRecordTransformer.transform(record);
}
