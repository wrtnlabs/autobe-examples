import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallProductsProductCodeShoppingMallProductVariants(props: {
  customer: CustomerPayload;
  productCode: string;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Retrieve the product by unique code
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Build filtering conditions
  const where: Prisma.shopping_mall_product_variantsWhereInput = {
    deleted_at: null,
    shopping_mall_product_id: product.id,
  };

  if (props.body.color !== undefined) {
    where.color = props.body.color === null ? null : props.body.color;
  }

  if (props.body.size !== undefined) {
    where.size = props.body.size === null ? null : props.body.size;
  }

  if (props.body.option !== undefined) {
    where.option = props.body.option === null ? null : props.body.option;
  }

  if (props.body.status !== undefined) {
    if (props.body.status !== null) {
      where.status = props.body.status;
    } else {
      where.status = undefined;
    }
  }

  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    where.price = {};
    if (props.body.min_price !== undefined) {
      where.price.gte = props.body.min_price;
    }
    if (props.body.max_price !== undefined) {
      where.price.lte = props.body.max_price;
    }
  }

  // Pagination
  const page = Math.max(props.body.page, 1);
  const limit = Math.min(Math.max(props.body.limit, 1), 100);
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: Prisma.shopping_mall_product_variantsOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (props.body.sort_by && props.body.order) {
    // validate sort_by is a field name of shopping_mall_product_variants
    const sortableFields = [
      "sku_code",
      "color",
      "size",
      "option",
      "price",
      "status",
      "created_at",
      "updated_at",
    ] as const;
    if (
      sortableFields.includes(
        props.body.sort_by as (typeof sortableFields)[number],
      )
    ) {
      const order = props.body.order.toLowerCase();
      if (order === "asc" || order === "desc") {
        orderBy = {};
        orderBy[
          props.body
            .sort_by as keyof Prisma.shopping_mall_product_variantsOrderByWithRelationInput
        ] = order as "asc" | "desc";
      }
    }
  }

  // Fetch data and total count concurrently
  const [variants, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({ where }),
  ]);

  // Map to summary interface
  const data = variants.map((variant) => ({
    id: variant.id as string & tags.Format<"uuid">,
    sku_code: variant.sku_code,
    price: variant.price,
  }));

  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
