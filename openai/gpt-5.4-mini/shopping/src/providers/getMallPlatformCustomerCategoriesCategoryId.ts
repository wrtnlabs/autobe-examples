import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerCategoriesCategoryId(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCategory> {
  const category =
    await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      ...MallPlatformCategoryTransformer.select(),
    });
  return await MallPlatformCategoryTransformer.transform(category);
}
