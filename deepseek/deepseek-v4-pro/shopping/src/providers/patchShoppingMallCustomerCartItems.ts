import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const limit = props.body.limit ?? 20;
  const take = Math.min(Math.max(limit, 1), 100);
  const whereBase = {
    shopping_mall_customer_id: props.customer.id,
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  let skip: number | undefined;
  let cursorWhere: Prisma.shopping_mall_cart_itemsWhereInput | undefined;
  if (props.body.cursor != null && props.body.cursor !== "") {
    let decoded: {
      created_at: string;
      id: string;
    };
    try {
      decoded = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString("utf-8"),
      );
    } catch {
      throw new HttpException("Invalid cursor", 400);
    }
    const isoPattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    if (!isoPattern.test(decoded.created_at)) {
      throw new HttpException("Invalid cursor: invalid date", 400);
    }
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(decoded.id)) {
      throw new HttpException("Invalid cursor: invalid id", 400);
    }
    cursorWhere = {
      OR: [
        { created_at: { lt: decoded.created_at } },
        {
          created_at: decoded.created_at,
          id: { lt: decoded.id },
        },
      ],
    } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  } else {
    const page =
      props.body.page != null && props.body.page > 0 ? props.body.page : 1;
    skip = (page - 1) * take;
  }
  const where = {
    ...whereBase,
    ...(cursorWhere ?? {}),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const records = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where,
    ...ShoppingMallCartItemAtSummaryTransformer.select(),
    skip,
    take,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereBase,
  });
  const currentPage =
    props.body.page != null && props.body.page > 0 ? props.body.page : 1;
  return {
    pagination: {
      current: props.body.cursor != null ? 1 : currentPage,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCartItemAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
// import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCartItem.IRequest;
// }): Promise<IPageIShoppingMallCartItem.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
//     ...ShoppingMallCartItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCartItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------