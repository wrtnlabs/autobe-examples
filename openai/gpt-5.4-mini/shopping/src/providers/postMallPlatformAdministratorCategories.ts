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

export async function postMallPlatformAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCategory.ICreate;
}): Promise<IMallPlatformCategory> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
    },
    select: {
      id: true,
    },
  });
  try {
    const created = await MyGlobal.prisma.mall_platform_categories.create({
      data: await MallPlatformCategoryCollector.collect({
        body: props.body,
      }),
      ...MallPlatformCategoryTransformer.select(),
    });
    return await MallPlatformCategoryTransformer.transform(created);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new HttpException("Category already exists", 409);
    }
    throw error;
  }
}
