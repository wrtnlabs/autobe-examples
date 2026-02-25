import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAnalyticsProducts(props: {
  administrator: AdministratorPayload;
  body: IEcommerceProductSnapshot.IRequest;
}): Promise<IPageIEcommerceProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date filter first
  const dateFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_at_from || props.body.created_at_to
      ? {
          ...(props.body.created_at_from && {
            gte: props.body.created_at_from,
          }),
          ...(props.body.created_at_to && { lte: props.body.created_at_to }),
        }
      : undefined;
  // Build where condition with all properties
  const whereInput = {
    ...(props.body.product_id && {
      ecommerce_product_id: props.body.product_id,
    }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.category_id && { category_id: props.body.category_id }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(dateFilter && { created_at: dateFilter }),
  } satisfies Prisma.ecommerce_product_snapshotsWhereInput;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        seller_id: true,
        category_id: true,
      },
    }),
    MyGlobal.prisma.ecommerce_product_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform to match ISummary DTO exactly
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id,
        name: snapshot.name,
        base_price: snapshot.base_price,
        created_at: toISOStringSafe(snapshot.created_at),
        seller_id: snapshot.seller_id,
        category_id: snapshot.category_id,
      }) satisfies IEcommerceProductSnapshot.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceProductSnapshot.ISummary;
}
