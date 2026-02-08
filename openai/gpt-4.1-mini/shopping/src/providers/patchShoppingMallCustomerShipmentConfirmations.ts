import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentConfirmation";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipmentConfirmations(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipmentConfirmation.IRequest;
}): Promise<IPageIShoppingMallShipmentConfirmation.ISummary> {
  // Use pagination parameters from request body, default to 1 and 100
  const page =
    "page" in props.body &&
    typeof props.body.page === "number" &&
    props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    "limit" in props.body &&
    typeof props.body.limit === "number" &&
    props.body.limit > 0
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  // Count total shipment confirmations with deleted_at null
  const total =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.count({
      where: { deleted_at: null },
    });
  // Get paginated shipment confirmation records
  const records =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Map records to ISummary format
  const data = records.map((record) => ({
    id: record.id,
    shipment_id: record.shopping_mall_shipment_id,
    confirmed_at: toISOStringSafe(record.confirmed_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
