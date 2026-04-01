import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination constraints
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Fetch customer's products (customer may be a seller)
  const customerProducts =
    await MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: {
        seller_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const productIds = customerProducts.map((p) => p.id);
  // Build WHERE clause with access control filter
  const whereInput: Prisma.ecommerce_mall_snapshotsWhereInput = {
    entity_type: props.body.entity_type,
    entity_id: props.body.entity_id,
    actor_id: props.body.actor_id ?? undefined,
    version: props.body.version,
    created_at: {
      ...(props.body.created_at_after && {
        gte: new Date(props.body.created_at_after),
      }),
      ...(props.body.created_at_before && {
        lte: new Date(props.body.created_at_before),
      }),
    },
    // Access control: customer can only view snapshots where:
    // - actor_id matches their ID, OR
    // - entity_type is 'product' and entity_id is in their product list
    OR: [
      { actor_id: props.customer.id },
      { entity_type: "product", entity_id: { in: productIds } },
    ],
  } satisfies Prisma.ecommerce_mall_snapshotsWhereInput;
  // Sort field validation
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  if (sortField !== "created_at") {
    throw new HttpException("Only 'created_at' sort is supported", 400);
  }
  // Fetch snapshots with pagination
  const data = await MyGlobal.prisma.ecommerce_mall_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: sortOrder === "asc" ? "asc" : "desc" },
    ...EcommerceMallSnapshotAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.ecommerce_mall_snapshots.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
