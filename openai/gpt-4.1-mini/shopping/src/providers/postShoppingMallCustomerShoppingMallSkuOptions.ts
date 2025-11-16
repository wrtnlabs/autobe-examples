import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallSkuOptions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSkuOption.ICreate;
}): Promise<IShoppingMallSkuOption> {
  const nowDate = new Date();

  const existing = await MyGlobal.prisma.shopping_mall_sku_options.findUnique({
    where: { code: props.body.code },
  });

  if (existing !== null) {
    throw new HttpException(
      `SKU option code '${props.body.code}' already exists.`,
      400,
    );
  }

  const id = v4();
  const deletedAtDate =
    props.body.deletedAt !== null && props.body.deletedAt !== undefined
      ? new Date(props.body.deletedAt)
      : null;

  const created = await MyGlobal.prisma.shopping_mall_sku_options.create({
    data: {
      id,
      code: props.body.code,
      shopping_mall_sku_option_group_id: props.body.groupCode,
      name: props.body.name,
      price_adjustment: props.body.priceAdjustment,
      created_at: nowDate,
      updated_at: nowDate,
      deleted_at: deletedAtDate,
    },
  });

  return {
    code: created.code,
    groupCode: created.shopping_mall_sku_option_group_id,
    name: created.name,
    priceAdjustment: created.price_adjustment,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
