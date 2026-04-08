import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductSnapshot.IRequest;
}): Promise<IPageIEcommerceProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_product_snapshotsWhereInput = {
    ecommerce_product_id: props.productId,
  };
  if (props.body.from || props.body.to) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.from) {
      created_at.gte = new Date(props.body.from);
    }
    if (props.body.to) {
      created_at.lte = new Date(props.body.to);
    }
    whereInput.created_at = created_at;
  }
  const records = await MyGlobal.prisma.ecommerce_product_snapshots.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" as const },
    skip,
    take: limit,
    ...EcommerceProductSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_product_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceProductSnapshot.ISummary;
}
