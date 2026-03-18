import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    props.body.page ?? 1,
  );
  const limit = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >(props.body.limit ?? 100);
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.visibility !== undefined && {
      visibility: props.body.visibility,
    }),
    ...(props.body.slug !== undefined && { slug: props.body.slug }),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.parent_category_id !== undefined && {
      parent_category_id: props.body.parent_category_id,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          {
            name: { contains: props.body.search, mode: "insensitive" },
          },
          {
            description: { contains: props.body.search, mode: "insensitive" },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const orderBy = (
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortDirection === "desc" ? "desc" : "asc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortDirection === "desc" ? "desc" : "asc" }
        : props.body.sortBy === "display_order"
          ? {
              display_order:
                props.body.sortDirection === "desc" ? "desc" : "asc",
            }
          : { display_order: "asc" }
  ) satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      visibility: true,
      display_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent_category_id: true,
    },
  });
  const records = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    await MyGlobal.prisma.shopping_mall_categories.count({ where }),
  );
  const pages = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    records === 0 ? 0 : Math.ceil(records / limit),
  );
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    },
    data: data.map((c) => {
      const deleted_at =
        c.deleted_at === null ? null : c.deleted_at.toISOString();
      return typia.assert<IShoppingMallCategory.ISummary>({
        id: typia.assert<string & tags.Format<"uuid">>(c.id),
        name: c.name,
        description: c.description,
        slug: c.slug,
        visibility: c.visibility,
        display_order: typia.assert<number & tags.Type<"int32">>(
          c.display_order,
        ),
        created_at: typia.assert<string & tags.Format<"date-time">>(
          c.created_at.toISOString(),
        ),
        updated_at: typia.assert<string & tags.Format<"date-time">>(
          c.updated_at.toISOString(),
        ),
        deleted_at:
          deleted_at === null
            ? null
            : typia.assert<string & tags.Format<"date-time">>(deleted_at),
        parent_category_id:
          c.parent_category_id === null
            ? null
            : typia.assert<string & tags.Format<"uuid">>(c.parent_category_id),
      });
    }),
  };
}
