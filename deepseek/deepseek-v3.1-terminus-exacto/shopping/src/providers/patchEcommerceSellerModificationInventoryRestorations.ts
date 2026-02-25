import { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceModificationInventoryRestorationAtSummaryTransformer } from "../transformers/EcommerceModificationInventoryRestorationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerModificationInventoryRestorations(props: {
  seller: SellerPayload;
  body: IEcommerceModificationInventoryRestoration.IRequest;
}): Promise<IPageIEcommerceModificationInventoryRestoration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions individually
  const conditions: Prisma.ecommerce_modification_inventory_restorationsWhereInput[] =
    [
      { deleted_at: null },
      {
        inventoryRecord: {
          ecommerce_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    ];
  // Add optional filters conditionally
  if (props.body.restoration_reason) {
    conditions.push({
      restoration_reason: { contains: props.body.restoration_reason },
    });
  }
  if (props.body.created_at_after) {
    conditions.push({
      created_at: { gte: props.body.created_at_after },
    });
  }
  if (props.body.created_at_before) {
    conditions.push({
      created_at: { lte: props.body.created_at_before },
    });
  }
  if (props.body.updated_at_after) {
    conditions.push({
      updated_at: { gte: props.body.updated_at_after },
    });
  }
  if (props.body.updated_at_before) {
    conditions.push({
      updated_at: { lte: props.body.updated_at_before },
    });
  }
  if (props.body.cancellation_request_id) {
    conditions.push({
      ecommerce_cancellation_request_id: props.body.cancellation_request_id,
    });
  }
  if (props.body.refund_request_id) {
    conditions.push({
      ecommerce_refund_request_id: props.body.refund_request_id,
    });
  }
  const whereInput: Prisma.ecommerce_modification_inventory_restorationsWhereInput =
    {
      AND: conditions,
    };
  const data =
    await MyGlobal.prisma.ecommerce_modification_inventory_restorations.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" } as const,
        ...EcommerceModificationInventoryRestorationAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_modification_inventory_restorations.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceModificationInventoryRestorationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
