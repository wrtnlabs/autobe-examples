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
import { MallPlatformCategoryAtSummaryTransformer } from "../transformers/MallPlatformCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerCategoriesCategoryIdSubcategories(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCategory.ISummary> {
  await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const categories = await MyGlobal.prisma.mall_platform_categories.findMany({
    where: {
      parent_category_id: props.categoryId,
      deleted_at: null,
    },
    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
    ...MallPlatformCategoryAtSummaryTransformer.select(),
  });
  const transformed =
    await MallPlatformCategoryAtSummaryTransformer.transformAll(categories);
  return (
    transformed[0] ??
    (() => {
      throw new Error("No subcategories found.");
    })()
  );
}
