import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSalesSaleCodeSnapshots(props: {
  admin: AdminPayload;
  saleCode: string;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "-created_at";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (
      props.body.shopping_mall_sale_id !== undefined &&
      props.body.shopping_mall_sale_id !== null
    ) {
      conditions.shopping_mall_sale_id = props.body.shopping_mall_sale_id;
    }

    if (props.body.status !== undefined && props.body.status !== null) {
      conditions.status = props.body.status;
    }

    const createdAtCondition: Record<string, unknown> = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      createdAtCondition.gte = new Date(props.body.created_at_from);
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      createdAtCondition.lte = new Date(props.body.created_at_to);
    }
    if (Object.keys(createdAtCondition).length > 0) {
      conditions.created_at = createdAtCondition;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        sort === "created_at" ? { created_at: "asc" } : { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_sale_snapshots.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      shopping_mall_sale_id: snapshot.shopping_mall_sale_id,
      title: snapshot.title,
      code: snapshot.code,
      status: snapshot.status,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
  };
}
