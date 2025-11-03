import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminCategoryTrees(props: {
  admin: AdminPayload;
  body: IShoppingCategoryTree.ICreate;
}): Promise<IShoppingCategoryTree> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.shopping_category_trees.create({
      data: {
        id,
        tree_code: props.body.tree_code,
        tree_name: props.body.tree_name,
        description:
          typeof props.body.description !== "undefined"
            ? props.body.description
            : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      tree_code: created.tree_code,
      tree_name: created.tree_name,
      description:
        typeof created.description !== "undefined" ? created.description : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        typeof created.deleted_at !== "undefined"
          ? created.deleted_at
            ? toISOStringSafe(created.deleted_at)
            : null
          : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("tree_code")
    ) {
      throw new HttpException("Category tree_code already exists", 409);
    }
    throw err;
  }
}
