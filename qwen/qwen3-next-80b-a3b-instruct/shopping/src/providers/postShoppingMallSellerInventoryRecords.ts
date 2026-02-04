import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";

export async function postShoppingMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // Validate quantityChange based on sourceType
  if (props.body.sourceType === "restock" && props.body.quantityChange <= 0) {
    throw new HttpException(
      "For restock, quantityChange must be positive",
      400,
    );
  }
  if (
    props.body.sourceType === "adjustment" &&
    props.body.quantityChange >= 0
  ) {
    throw new HttpException(
      "For adjustment, quantityChange must be negative",
      400,
    );
  }
  // Use collector to transform request to database format
  const record = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
    }),
  });
  // Return response matching IShoppingMallInventoryRecord interface exactly
  return {
    totalQuantityChange: record.quantity_change,
    transactionCount: 1,
    averageChange: record.quantity_change,
  };
}
