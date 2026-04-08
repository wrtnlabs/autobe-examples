import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerSearch(props: {
  customer: CustomerPayload;
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      is_suspended: false,
      is_banned: false,
      deleted_at: null,
    },
  };
  if (props.body.search !== undefined) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  if (props.body.category_id !== undefined) {
    if (props.body.include_subcategories === true) {
      const categoryIds = await getCategoryIdsIncludingSubcategories(
        props.body.category_id,
      );
      whereInput.category_id = {
        in: categoryIds,
      } satisfies Prisma.StringFilter;
    } else {
      whereInput.category_id = props.body.category_id;
    }
  }
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    const priceFilter: Prisma.FloatFilter = {};
    if (props.body.min_price !== undefined) {
      priceFilter.gte = props.body.min_price;
    }
    if (props.body.max_price !== undefined) {
      priceFilter.lte = props.body.max_price;
    }
    whereInput.base_price = priceFilter satisfies Prisma.FloatFilter;
  }
  // in_stock_only filter removed - stock status is calculated in transformer
  const orderByInput: Prisma.ecommerce_productsOrderByWithRelationInput =
    (() => {
      const sort = props.body.sort_by ?? "created_at";
      const order = props.body.sort_order ?? "desc";
      if (sort === "base_price") {
        return { base_price: order };
      } else if (sort === "name") {
        return { name: order };
      } else if (sort === "updated_at") {
        return { updated_at: order };
      } else {
        return { created_at: order };
      }
    })();
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_products.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_products.count({ where: whereInput }),
  ]);
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceProductAtSummaryTransformer.transform,
    ),
  };
}
async function getCategoryIdsIncludingSubcategories(
  categoryId: string & tags.Format<"uuid">,
): Promise<(string & tags.Format<"uuid">)[]> {
  const subcategories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: {
      parent_id: categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const subcategoryIds = subcategories.map((cat) => cat.id);
  return [categoryId, ...subcategoryIds];
}
