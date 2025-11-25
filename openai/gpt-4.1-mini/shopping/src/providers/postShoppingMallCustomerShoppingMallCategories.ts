import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCategories(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingMallCategory.ICreate;
}): Promise<IShoppingMallShoppingMallCategory> {
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_categories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: props.body.name,
        description:
          props.body.description === undefined
            ? undefined
            : (props.body.description ?? null),
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description ?? null,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("name")
    ) {
      throw new HttpException(`Category name must be unique.`, 409);
    }

    throw error;
  }
}
