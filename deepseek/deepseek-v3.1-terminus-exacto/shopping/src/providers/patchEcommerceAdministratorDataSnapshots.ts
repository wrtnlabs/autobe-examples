import { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceDataSnapshotAtSummaryTransformer } from "../transformers/EcommerceDataSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceAdministratorDataSnapshots(props: {
  administrator: AdministratorPayload;
  body: IEcommerceDataSnapshot.IRequest;
}): Promise<IPageIEcommerceDataSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.ecommerce_data_snapshotsWhereInput = {
    ...(props.body.entity_type && { entity_type: props.body.entity_type }),
    ...(props.body.entity_ids &&
      props.body.entity_ids.length > 0 && {
        entity_id: { in: props.body.entity_ids },
      }),
    ...(props.body.creator_customer_id && {
      created_by_customer_id: props.body.creator_customer_id,
    }),
    ...(props.body.creator_seller_id && {
      created_by_seller_id: props.body.creator_seller_id,
    }),
    ...(props.body.creator_administrator_id && {
      created_by_administrator_id: props.body.creator_administrator_id,
    }),
    ...(props.body.creator_super_administrator_id && {
      created_by_super_administrator_id:
        props.body.creator_super_administrator_id,
    }),
    ...(props.body.created_at_before && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.change_description_search && {
      change_description: {
        contains: props.body.change_description_search,
        mode: "insensitive",
      },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_data_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceDataSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_data_snapshots.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await Promise.all(
    data.map(EcommerceDataSnapshotAtSummaryTransformer.transform),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
