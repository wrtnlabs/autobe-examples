import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCategoryTransformer } from "../transformers/CommunityPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCategory> {
  const category =
    await MyGlobal.prisma.community_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...CommunityPlatformCategoryTransformer.select(),
    });
  return await CommunityPlatformCategoryTransformer.transform(category);
}
