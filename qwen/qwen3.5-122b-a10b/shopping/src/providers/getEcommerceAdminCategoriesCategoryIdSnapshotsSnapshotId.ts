import { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCategorySnapshotTransformer } from "../transformers/EcommerceCategorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminCategoriesCategoryIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCategorySnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_category_snapshots.findUniqueOrThrow({
      ...EcommerceCategorySnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_category_id: props.categoryId,
      },
    } satisfies Prisma.ecommerce_category_snapshotsFindUniqueArgs);
  return await EcommerceCategorySnapshotTransformer.transform(record);
}
