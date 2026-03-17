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
import { ShoppingMallSellerProfileAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfiles(props: {
  body: IShoppingMallSellerProfile.IRequest;
}): Promise<IPageIShoppingMallSellerProfile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const deletedAtFilter:
    | Prisma.DateTimeNullableFilter<"shopping_mall_seller_profiles">
    | undefined =
    props.body.deleted_at === undefined
      ? undefined
      : props.body.deleted_at === null
        ? { equals: null }
        : { equals: props.body.deleted_at };
  const where = {
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.shop_name !== undefined && props.body.shop_name.length !== 0
      ? {
          shop_name: {
            contains: props.body.shop_name,
            mode: "insensitive",
          },
        }
      : {}),
    ...(deletedAtFilter === undefined ? {} : { deleted_at: deletedAtFilter }),
  } satisfies Prisma.shopping_mall_seller_profilesWhereInput;
  const orderBy: Prisma.shopping_mall_seller_profilesOrderByWithRelationInput[] =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? [{ created_at: "desc" }, { id: "asc" }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "updated_at_desc"
          ? [{ updated_at: "desc" }, { id: "asc" }]
          : props.body.sort === "updated_at_asc"
            ? [{ updated_at: "asc" }, { id: "asc" }]
            : props.body.sort === "shop_name_asc"
              ? [{ shop_name: "asc" }, { id: "asc" }]
              : props.body.sort === "shop_name_desc"
                ? [{ shop_name: "desc" }, { id: "asc" }]
                : (() => {
                    throw new HttpException("Unsupported sort field", 400);
                  })();
  const rows = await MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shop_name: true,
      shop_description: true,
      logo_uri: true,
      seller: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          banned: true,
          approval_status: true,
          rejection_reason: true,
          suspended: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_seller_profiles.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallSellerProfileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
