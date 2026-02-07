import { IEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceSnapshot.IRequest;
}): Promise<IPageIEcommerceSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    entity_type: props.body.entity_type,
    entity_id: props.body.entity_id,
    created_at: {
      gte: props.body.created_at_min,
      lte: props.body.created_at_max,
    },
    snapshot_data: props.body.search
      ? {
          contains: props.body.search,
        }
      : undefined,
  } as const satisfies Prisma.ecommerce_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.ecommerce_snapshots.count({
    where: whereInput,
  });
  return {
    data: [
      ...data.map((item) => ({
        id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
      })),
    ],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
