import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null as null,
    ...(props.body.searchProductCode !== undefined &&
    props.body.searchProductCode !== null
      ? { code: { equals: props.body.searchProductCode } }
      : {}),
    ...(props.body.searchProductName !== undefined &&
    props.body.searchProductName !== null
      ? { name: { contains: props.body.searchProductName } }
      : {}),
    ...(props.body.searchDescription !== undefined &&
    props.body.searchDescription !== null
      ? { description: { contains: props.body.searchDescription } }
      : {}),
    ...(props.body.searchIsActive !== undefined &&
    props.body.searchIsActive !== null
      ? { is_active: props.body.searchIsActive }
      : {}),
    ...(props.body.searchSellerId !== undefined &&
    props.body.searchSellerId !== null
      ? { seller_id: props.body.searchSellerId }
      : {}),
  };

  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: whereCondition,
      take: limit,
      skip,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where: whereCondition }),
  ]);

  // Prepare the map without using `as` by using const intermediate variables
  const mappedData = products.map((product) => {
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      product.created_at,
    );
    const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      product.updated_at,
    );
    const deletedAt: (string & tags.Format<"date-time">) | null =
      product.deleted_at ? toISOStringSafe(product.deleted_at) : null;

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      is_active: product.is_active,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
    };
  });

  return {
    data: mappedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
