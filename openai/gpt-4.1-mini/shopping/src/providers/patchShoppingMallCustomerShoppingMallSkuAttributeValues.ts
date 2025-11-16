import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { IPageIShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuAttributeValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallSkuAttributeValues(props: {
  customer: CustomerPayload;
  body: IShoppingMallSkuAttributeValue.IRequest;
}): Promise<IPageIShoppingMallSkuAttributeValue.ISummary> {
  const whereClause = {
    deleted_at: props.body.include_deleted ? undefined : null,
    ...(props.body.attribute_code !== undefined && {
      attribute_code: props.body.attribute_code,
    }),
    ...(props.body.code !== undefined && { code: props.body.code }),
    ...(props.body.label !== undefined && { label: props.body.label }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search_text !== undefined
      ? {
          OR: [
            { code: { contains: props.body.search_text } },
            { label: { contains: props.body.search_text } },
            { value: { contains: props.body.search_text } },
          ],
        }
      : {}),
  };

  const take = (props.body.limit ?? 100) satisfies number as number;
  const skip = (props.body.offset ?? 0) satisfies number as number;

  const orderBy =
    props.body.sort_by && props.body.sort_order
      ? ({
          [props.body.sort_by]: props.body.sort_order satisfies
            | "asc"
            | "desc" as "asc" | "desc",
        } satisfies { [key: string]: "asc" | "desc" })
      : { code: "asc" as const };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_attribute_values.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        value: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sku_attribute_values.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Math.floor(skip / take) + 1,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: items.map((item) => ({
      id: item.id,
      value: item.value,
    })),
  };
}
