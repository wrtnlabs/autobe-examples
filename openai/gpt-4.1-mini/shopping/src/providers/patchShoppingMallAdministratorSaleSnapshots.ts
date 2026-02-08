import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
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

export async function patchShoppingMallAdministratorSaleSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  const page: number = (props.body as any).page ?? 1;
  const limit: number = (props.body as any).limit ?? 20;
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpException(
      "Invalid pagination parameter: page must be a positive integer",
      400,
    );
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpException(
      "Invalid pagination parameter: limit must be a positive integer",
      400,
    );
  }
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_snapshotsWhereInput = {
    deleted_at: null,
  };
  if (typeof (props.body as any).category_id === "string") {
    where.category_id = (props.body as any).category_id;
  }
  const basePriceMin = (props.body as any).base_price_min;
  const basePriceMax = (props.body as any).base_price_max;
  if (typeof basePriceMin === "number" && typeof basePriceMax === "number") {
    where.base_price = {
      gte: basePriceMin,
      lte: basePriceMax,
    };
  } else if (typeof basePriceMin === "number") {
    where.base_price = { gte: basePriceMin };
  } else if (typeof basePriceMax === "number") {
    where.base_price = { lte: basePriceMax };
  }
  const createdAtMinRaw = (props.body as any).created_at_min;
  const createdAtMaxRaw = (props.body as any).created_at_max;
  if (typeof createdAtMinRaw === "string") {
    where.created_at = { gte: toISOStringSafe(createdAtMinRaw) };
  }
  if (typeof createdAtMaxRaw === "string") {
    where.created_at = {
      ...(typeof where.created_at === "object" && where.created_at !== null
        ? where.created_at
        : {}),
      lte: toISOStringSafe(createdAtMaxRaw),
    };
  }
  const keyword = (props.body as any).keyword;
  if (typeof keyword === "string" && keyword.trim().length > 0) {
    where.OR = [
      { title: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }
  const data = await MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_snapshots.count({
    where,
  });
  // Since IShoppingMallSaleSnapshot.ISummary is empty, map empty objects
  const transformedData: IShoppingMallSaleSnapshot.ISummary[] = data.map(
    () => ({}),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
