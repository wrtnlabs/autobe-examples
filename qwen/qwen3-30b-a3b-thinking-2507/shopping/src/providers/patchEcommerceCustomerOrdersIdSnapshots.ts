import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderAtSummaryTransformer } from "../transformers/EcommerceOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersIdSnapshots(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceOrderSnapshot.ISummary> {
  const { page = 1, limit = 10, sort, search } = props.body;
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: {
      id: props.id,
      customer_id: props.customer.id,
    },
  });
  // Build where clause
  let where: Prisma.ecommerce_order_snapshotsWhereInput = {
    ecommerce_order_id: props.id,
  };
  if (search) {
    where = {
      ...where,
      order: { id: { equals: search } },
    };
  }
  // Build orderBy
  let orderBy:
    | Prisma.ecommerce_order_snapshotsOrderByWithRelationInput
    | Prisma.ecommerce_order_snapshotsOrderByWithRelationInput[]
    | undefined = {
    createdAt: "desc",
  };
  if (sort) {
    const [field, direction] = sort.split(":");
    if (field && direction) {
      orderBy = {
        [field]: direction as "asc" | "desc",
      };
    }
  }
  const skip = (page - 1) * limit;
  const total = await MyGlobal.prisma.ecommerce_order_snapshots.count({
    where,
  });
  const snapshots = await MyGlobal.prisma.ecommerce_order_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      order: EcommerceOrderAtSummaryTransformer.select(),
    },
  });
  const data = await Promise.all(
    snapshots.map(async (snapshot) => ({
      id: snapshot.id,
      order: await EcommerceOrderAtSummaryTransformer.transform(snapshot.order),
    })),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
