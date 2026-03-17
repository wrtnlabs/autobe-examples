import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSuperAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdministrators(props: {
  body: IShoppingMallSuperAdministrator.IRequest;
}): Promise<IPageIShoppingMallSuperAdministrator.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    AND: [
      ...(props.body.id !== undefined
        ? [
            {
              id: props.body.id,
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.email !== undefined
        ? [
            {
              email: {
                equals: props.body.email,
                mode: "insensitive",
              },
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.search !== undefined && props.body.search.length !== 0
        ? [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.active !== undefined
        ? [
            {
              active: props.body.active,
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined
        ? [
            {
              created_at: {
                ...(props.body.created_at_from !== undefined
                  ? {
                      gte: props.body.created_at_from,
                    }
                  : {}),
                ...(props.body.created_at_to !== undefined
                  ? {
                      lte: props.body.created_at_to,
                    }
                  : {}),
              },
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.updated_at_from !== undefined ||
      props.body.updated_at_to !== undefined
        ? [
            {
              updated_at: {
                ...(props.body.updated_at_from !== undefined
                  ? {
                      gte: props.body.updated_at_from,
                    }
                  : {}),
                ...(props.body.updated_at_to !== undefined
                  ? {
                      lte: props.body.updated_at_to,
                    }
                  : {}),
              },
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : []),
      ...(props.body.deletedOnly === true
        ? [
            {
              deleted_at: {
                not: null,
                ...(props.body.deleted_at_from !== undefined
                  ? {
                      gte: props.body.deleted_at_from,
                    }
                  : {}),
                ...(props.body.deleted_at_to !== undefined
                  ? {
                      lte: props.body.deleted_at_to,
                    }
                  : {}),
              },
            } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
          ]
        : props.body.includeDeleted === true
          ? [
              ...(props.body.deleted_at_from !== undefined ||
              props.body.deleted_at_to !== undefined
                ? [
                    {
                      deleted_at: {
                        ...(props.body.deleted_at_from !== undefined
                          ? {
                              gte: props.body.deleted_at_from,
                            }
                          : {}),
                        ...(props.body.deleted_at_to !== undefined
                          ? {
                              lte: props.body.deleted_at_to,
                            }
                          : {}),
                      },
                    } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
                  ]
                : []),
            ]
          : [
              {
                deleted_at: null,
              } satisfies Prisma.shopping_mall_super_administratorsWhereInput,
            ]),
    ],
  } satisfies Prisma.shopping_mall_super_administratorsWhereInput;
  const orderBy = (
    props.body.sort === "id"
      ? [{ id: "asc" }]
      : props.body.sort === "-id"
        ? [{ id: "desc" }]
        : props.body.sort === "email"
          ? [{ email: "asc" }, { id: "asc" }]
          : props.body.sort === "-email"
            ? [{ email: "desc" }, { id: "desc" }]
            : props.body.sort === "active"
              ? [{ active: "asc" }, { id: "asc" }]
              : props.body.sort === "-active"
                ? [{ active: "desc" }, { id: "desc" }]
                : props.body.sort === "created_at"
                  ? [{ created_at: "asc" }, { id: "asc" }]
                  : props.body.sort === "-created_at"
                    ? [{ created_at: "desc" }, { id: "desc" }]
                    : props.body.sort === "updated_at"
                      ? [{ updated_at: "asc" }, { id: "asc" }]
                      : props.body.sort === "-updated_at"
                        ? [{ updated_at: "desc" }, { id: "desc" }]
                        : props.body.sort === "deleted_at"
                          ? [{ deleted_at: "asc" }, { id: "asc" }]
                          : props.body.sort === "-deleted_at"
                            ? [{ deleted_at: "desc" }, { id: "desc" }]
                            : [{ updated_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_super_administratorsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.shopping_mall_super_administrators.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallSuperAdministratorAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_super_administrators.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSuperAdministratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
