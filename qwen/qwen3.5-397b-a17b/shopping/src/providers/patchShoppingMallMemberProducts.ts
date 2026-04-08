import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberProducts(props: {
  member: MemberPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      deleted_at: null,
    },
  };
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = props.body.search.trim();
    whereInput.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  if (props.body.categoryId) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.categoryId, deleted_at: null },
    });
    if (!category) {
      throw new HttpException("Category not found", 404);
    }
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { parent_id: props.body.categoryId, deleted_at: null },
        select: { id: true },
      });
    const categoryIds = [
      props.body.categoryId,
      ...subcategories.map((c) => c.id),
    ];
    whereInput.shopping_mall_category_id = { in: categoryIds };
  }
  const priceFilter: Prisma.FloatFilter = {};
  if (props.body.minPrice !== undefined) {
    priceFilter.gte = props.body.minPrice;
  }
  if (props.body.maxPrice !== undefined) {
    priceFilter.lte = props.body.maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    whereInput.base_price = priceFilter;
  }
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput[] =
    [];
  const sort = props.body.sort ?? (props.body.search ? "relevance" : "newest");
  if (sort === "price_asc") {
    orderByInput.push({ base_price: "asc" });
  } else if (sort === "price_desc") {
    orderByInput.push({ base_price: "desc" });
  } else if (sort === "newest") {
    orderByInput.push({ created_at: "desc" });
  } else if (sort === "name_asc") {
    orderByInput.push({ name: "asc" });
  }
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  let filteredProducts = products;
  if (props.body.inStock === true) {
    filteredProducts = products.filter((product) => {
      const hasStock = product.variants.some((variant) => {
        const totalQuantity = variant.inventoryRecords.reduce(
          (sum, record) => sum + record.quantity_delta,
          0,
        );
        return totalQuantity > 0;
      });
      return hasStock;
    });
  }
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      filteredProducts,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
  };
}
