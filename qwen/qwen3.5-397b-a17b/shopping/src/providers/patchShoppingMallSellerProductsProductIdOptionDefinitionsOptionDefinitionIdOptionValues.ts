import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductOptionValueAtSummaryTransformer } from "../transformers/ShoppingMallProductOptionValueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductOptionValue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_option_definitions.findUniqueOrThrow(
    {
      where: { id: props.optionDefinitionId },
    },
  );
  const whereInput = {
    shopping_mall_product_option_definition_id: props.optionDefinitionId,
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search },
    }),
  } satisfies Prisma.shopping_mall_product_option_valuesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...ShoppingMallProductOptionValueAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_product_option_values.count(
    {
      where: whereInput,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductOptionValueAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
