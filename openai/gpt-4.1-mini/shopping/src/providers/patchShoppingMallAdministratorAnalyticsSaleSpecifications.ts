import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallAdministratorAnalyticsSaleSpecifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleSpecification.IRequest;
}): Promise<IPageIShoppingMallSaleSpecification.ISummary> {
  const page =
    props.body.page !== undefined &&
    props.body.page !== null &&
    props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    props.body.limit !== undefined &&
    props.body.limit !== null &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.shopping_mall_sale_specificationsWhereInput = {
    deleted_at: null,
    ...(props.body.specificationKey
      ? { specification_key: { contains: props.body.specificationKey } }
      : {}),
    ...(props.body.specificationValue
      ? { specification_value: { contains: props.body.specificationValue } }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_specifications.findMany(
    {
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        specification_key: true,
        specification_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shoppingMallSale: {
          select: {
            id: true,
            name: true,
            base_price: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_uri: true,
                approval_status: true,
                rejection_reason: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_specifications.count({
    where: whereConditions,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  return {
    pagination,
    data: data.map((record) => ({
      id: record.id,
      specificationKey: record.specification_key,
      specificationValue: record.specification_value,
      createdAt: toISOStringSafe(record.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deletedAt: record.deleted_at
        ? (toISOStringSafe(record.deleted_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null,
      shoppingMallSale: {
        id: record.shoppingMallSale.id,
        name: record.shoppingMallSale.name,
        basePrice: record.shoppingMallSale.base_price,
        status: record.shoppingMallSale.status,
        createdAt: toISOStringSafe(
          record.shoppingMallSale.created_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(
          record.shoppingMallSale.updated_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        deletedAt: record.shoppingMallSale.deleted_at
          ? (toISOStringSafe(
              record.shoppingMallSale.deleted_at,
            ) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">)
          : null,
        seller: {
          id: record.shoppingMallSale.seller.id,
          email: record.shoppingMallSale.seller.email,
          shopName: record.shoppingMallSale.seller.shop_name,
          shopDescription:
            record.shoppingMallSale.seller.shop_description ?? null,
          logoUri: record.shoppingMallSale.seller.logo_uri ?? null,
          approvalStatus: record.shoppingMallSale.seller.approval_status,
          rejectionReason:
            record.shoppingMallSale.seller.rejection_reason ?? null,
        },
        category: {
          id: record.shoppingMallSale.category.id,
          name: record.shoppingMallSale.category.name,
          description: record.shoppingMallSale.category.description,
          created_at: toISOStringSafe(
            record.shoppingMallSale.category.created_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            record.shoppingMallSale.category.updated_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          deleted_at: record.shoppingMallSale.category.deleted_at
            ? (toISOStringSafe(
                record.shoppingMallSale.category.deleted_at,
              ) satisfies string & tags.Format<"date-time"> as string &
                tags.Format<"date-time">)
            : null,
        },
      },
    })),
  };
}
