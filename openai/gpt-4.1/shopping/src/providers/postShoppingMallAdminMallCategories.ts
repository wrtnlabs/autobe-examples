import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminMallCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  const id = v4();
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.shopping_mall_categories.create({
      data: {
        id: id,
        name: props.body.name,
        description: props.body.description,
        sort_order: props.body.sort_order,
        status: props.body.status,
        parent_id:
          props.body.parent_id === undefined ? null : props.body.parent_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      sort_order: created.sort_order,
      status: created.status,
      parent_id: created.parent_id === null ? undefined : created.parent_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null || created.deleted_at === undefined
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Category name already exists (name unique)",
        409,
      );
    }
    throw err;
  }
}
