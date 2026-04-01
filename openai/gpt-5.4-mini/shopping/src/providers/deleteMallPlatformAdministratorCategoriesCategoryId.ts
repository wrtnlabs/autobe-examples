import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteMallPlatformAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const category = await prisma.mall_platform_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
      },
      select: {
        id: true,
        subcategories: {
          select: {
            id: true,
          },
        },
      },
    });
    if (category.subcategories.length > 0) {
      throw new HttpException("Invalid category hierarchy", 400);
    }
    await prisma.mall_platform_products.updateMany({
      where: {
        category_id: category.id,
      },
      data: {
        category_id: null,
      },
    });
    await prisma.mall_platform_categories.delete({
      where: {
        id: category.id,
      },
    });
  });
}
