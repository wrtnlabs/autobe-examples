import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategories(): Promise<IEcommerceMallCategory> {
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_category_snapshots.findMany({
      ...EcommerceMallCategoryTransformer.select(),
      orderBy: { created_at: "desc" },
    });
  const transformed = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallCategoryTransformer.transform,
  );
  // Return the latest snapshot as the single response object
  if (transformed.length === 0) {
    return {
      id: "" as string & tags.Format<"uuid">,
      snapshot_type: "edit" as const,
      before_name: "",
      before_description: "",
      after_name: "",
      after_description: "",
      created_at: toISOStringSafe(new Date()),
      category_id: "" as string & tags.Format<"uuid">,
      admin_id: null,
    };
  }
  return transformed[0];
}
