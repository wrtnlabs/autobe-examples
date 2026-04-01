import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCategoryCollector } from "../collectors/MallPlatformCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorCategoriesParentCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  parentCategoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.ICreate;
}): Promise<IMallPlatformCategory> {
  const parentCategory =
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: {
        id: props.parentCategoryId,
      },
      select: {
        id: true,
        parentCategory: {
          select: {
            id: true,
          },
        },
      },
    });
  if (parentCategory.parentCategory !== null) {
    throw new HttpException(
      "Subcategories can only be created under a top-level category",
      400,
    );
  }
  const duplicated = await MyGlobal.prisma.mall_platform_categories.findFirst({
    where: {
      parent_category_id: props.parentCategoryId,
      name: props.body.name,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (duplicated !== null) {
    throw new HttpException(
      "Category name already exists under this parent",
      409,
    );
  }
  const created = await MyGlobal.prisma.mall_platform_categories.create({
    data: {
      ...(await MallPlatformCategoryCollector.collect({
        body: props.body,
      })),
      parentCategory: {
        connect: {
          id: props.parentCategoryId,
        },
      },
    },
    ...MallPlatformCategoryTransformer.select(),
  });
  return await MallPlatformCategoryTransformer.transform(created);
}
