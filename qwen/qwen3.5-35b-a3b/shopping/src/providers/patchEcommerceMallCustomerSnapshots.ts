import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_snapshotsWhereInput = {
    actor: {
      id: props.customer.id,
    },
    ...(props.body.entity_type !== undefined && {
      entity_type: props.body.entity_type,
    }),
    ...(props.body.entity_id !== undefined && {
      entity_id: props.body.entity_id,
    }),
    ...(props.body.actor_id !== undefined &&
      props.body.actor_id !== null && {
        actor_id: props.body.actor_id,
      }),
    ...(props.body.version !== undefined && {
      version: props.body.version,
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_after),
      },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_before),
      },
    }),
  } satisfies Prisma.ecommerce_mall_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.order === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_snapshotsOrderByWithRelationInput,
    ...EcommerceMallSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
