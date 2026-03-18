import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSellerProfiles(props: {
  customer: CustomerPayload;
  body: IShoppingMallSellerProfile.IRequest;
}): Promise<IPageIShoppingMallSellerProfile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.length > 0
      ? props.body.search
      : undefined;
  const where: Prisma.shopping_mall_seller_profilesWhereInput = {
    deleted_at: null,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { shop_name: { contains: search, mode: "insensitive" } },
            { shop_description: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const data = await MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ updated_at: "desc" }, { id: "desc" }],
    ...ShoppingMallSellerProfileAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.shopping_mall_seller_profiles.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerProfileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallSellerProfile.ISummary;
}
