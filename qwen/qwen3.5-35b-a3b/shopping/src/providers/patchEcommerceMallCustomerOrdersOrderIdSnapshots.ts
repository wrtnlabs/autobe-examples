import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSnapshot.ISummary> {
  // Validate order exists and belongs to the customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId, customer_id: props.customer.id },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause - filter by order ID, entity type 'order_snapshot', and optional status
  const whereInput: Prisma.ecommerce_mall_snapshotsWhereInput = {
    entity_type: "order_snapshot",
    entity_id: props.orderId,
    ...(props.body.filter?.status !== undefined && {
      snapshot_data: {
        contains: JSON.stringify({ status: props.body.filter.status }),
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.ecommerce_mall_snapshotsWhereInput;
  // Build orderBy from sort parameter
  const orderByInput: Prisma.ecommerce_mall_snapshotsOrderByWithRelationInput[] =
    props.body.sort === undefined || props.body.sort === ""
      ? [{ created_at: "desc" as const }]
      : (() => {
          const [field, direction] = props.body.sort.split(":") as [
            string,
            "asc" | "desc",
          ];
          const orderField: Record<string, Prisma.SortOrder> = {
            created_at: direction,
            version: direction,
            entity_id: direction,
          };
          const sortField = orderField[field] ?? direction;
          return [
            { [field]: sortField },
          ] satisfies Prisma.ecommerce_mall_snapshotsOrderByWithRelationInput[];
        })();
  const data = await MyGlobal.prisma.ecommerce_mall_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      entity_type: true,
      entity_id: true,
      version: true,
      created_at: true,
      actor: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_snapshots.count({
    where: whereInput,
  });
  return {
    data: data.map((snapshot) => ({
      id: snapshot.id,
      entity_type: snapshot.entity_type,
      entity_id: snapshot.entity_id,
      version: snapshot.version,
      created_at: snapshot.created_at.toISOString(),
      actor:
        snapshot.actor === null
          ? null
          : ({
              id: snapshot.actor.id,
              email: snapshot.actor.email,
              status: snapshot.actor.status,
              created_at: snapshot.actor.created_at.toISOString(),
              deleted_at: snapshot.actor.deleted_at?.toISOString() ?? null,
            } satisfies IEcommerceMallCustomer.ISummary),
    })) satisfies IEcommerceMallSnapshot.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallSnapshot.ISummary;
}
