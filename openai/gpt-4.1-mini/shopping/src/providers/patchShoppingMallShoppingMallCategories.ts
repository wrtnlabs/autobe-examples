import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Ensure where.AND is explicitly typed as array
  const where: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    AND: [],
  };

  if (props.body.search) {
    // Confirm where.AND is array
    (where.AND as Prisma.shopping_mall_categoriesWhereInput[]).push({
      OR: [
        { name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    });
  }

  if (props.body.status) {
    where.status = props.body.status;
  }

  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    where.created_at = { gte: props.body.created_at_from };
  }

  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    if (where.created_at === undefined || where.created_at === null) {
      where.created_at = { lte: props.body.created_at_to };
    } else {
      // If where.created_at is DateTimeFilter, safely assign lte
      // Otherwise, convert to DateTimeFilter format
      if (
        typeof where.created_at === "object" &&
        !(where.created_at instanceof Date)
      ) {
        (where.created_at as Prisma.DateTimeFilter).lte =
          props.body.created_at_to;
      } else {
        where.created_at = {
          gte:
            typeof where.created_at === "string" ||
            where.created_at instanceof Date
              ? where.created_at
              : undefined,
          lte: props.body.created_at_to,
        };
      }
    }
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id satisfies string as string & tags.Format<"uuid">,
      name: item.name,
      status: item.status,
      description: item.description === null ? undefined : item.description,
      created_at: item.created_at
        ? toISOStringSafe(item.created_at)
        : undefined,
      updated_at: item.updated_at
        ? toISOStringSafe(item.updated_at)
        : undefined,
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
