import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function patchShoppingMallAdministratorProductCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const toDateTimeString = (
    dt: Date | null | undefined,
  ): string & tags.Format<"date-time"> => {
    if (dt === null || dt === undefined) {
      // Provide fallback default date-time string (ISO 8601 format)
      return "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">;
    }
    return toISOStringSafe(dt)!;
  };
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_categoriesWhereInput = {
    deleted_at: null,
  };
  if (
    typeof props.body.search === "string" &&
    props.body.search.trim() !== ""
  ) {
    const keyword = props.body.search.trim();
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }
  let orderBy: Prisma.shopping_mall_product_categoriesOrderByWithRelationInput =
    { created_at: "desc" };
  if (props.body.sortBy === "name" || props.body.sortBy === "created_at") {
    const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
    orderBy = { [props.body.sortBy]: sortOrder };
  }
  const total = await MyGlobal.prisma.shopping_mall_product_categories.count({
    where,
  });
  const records =
    await MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });
  const data = records.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: toDateTimeString(r.created_at),
    updated_at: toDateTimeString(r.updated_at),
    deleted_at: toDateTimeString(r.deleted_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
