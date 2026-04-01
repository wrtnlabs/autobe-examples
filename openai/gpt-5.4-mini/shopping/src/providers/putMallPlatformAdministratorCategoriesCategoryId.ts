import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.IUpdate;
}): Promise<IMallPlatformCategory> {
  void props.administrator;
  const current =
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_category_id: true,
      },
    });
  const nextParentCategoryId =
    props.body.parentCategoryId === undefined
      ? current.parent_category_id
      : props.body.parentCategoryId;
  if (nextParentCategoryId === props.categoryId) {
    throw new HttpException("Category cannot be its own parent", 400);
  }
  if (nextParentCategoryId !== null) {
    const parent =
      await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
        where: { id: nextParentCategoryId },
        select: {
          id: true,
          parent_category_id: true,
        },
      });
    if (parent.parent_category_id !== null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
  }
  await MyGlobal.prisma.mall_platform_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.parentCategoryId !== undefined
        ? { parent_category_id: props.body.parentCategoryId }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...MallPlatformCategoryTransformer.select(),
    });
  return await MallPlatformCategoryTransformer.transform(updated);
}
