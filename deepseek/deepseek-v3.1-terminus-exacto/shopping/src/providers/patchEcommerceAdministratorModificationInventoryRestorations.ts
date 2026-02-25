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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceModificationInventoryRestorationAtSummaryTransformer } from "../transformers/EcommerceModificationInventoryRestorationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorModificationInventoryRestorations(props: {
  administrator: AdministratorPayload;
  body: IEcommerceModificationInventoryRestoration.IRequest;
}): Promise<IPageIEcommerceModificationInventoryRestoration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.ecommerce_modification_inventory_restorationsWhereInput =
    {
      deleted_at: null,
      ...(props.body.restoration_reason && {
        restoration_reason: { contains: props.body.restoration_reason },
      }),
      ...(props.body.created_at_after && {
        created_at: { gte: new Date(props.body.created_at_after) },
      }),
      ...(props.body.created_at_before && {
        created_at: { lte: new Date(props.body.created_at_before) },
      }),
      ...(props.body.updated_at_after && {
        updated_at: { gte: new Date(props.body.updated_at_after) },
      }),
      ...(props.body.updated_at_before && {
        updated_at: { lte: new Date(props.body.updated_at_before) },
      }),
      ...(props.body.cancellation_request_id && {
        ecommerce_cancellation_request_id: props.body.cancellation_request_id,
      }),
      ...(props.body.refund_request_id && {
        ecommerce_refund_request_id: props.body.refund_request_id,
      }),
    };
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_modification_inventory_restorations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceModificationInventoryRestorationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_modification_inventory_restorations.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await Promise.all(
    data.map(
      EcommerceModificationInventoryRestorationAtSummaryTransformer.transform,
    ),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
