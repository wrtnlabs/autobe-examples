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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

async function patchEcommerceAdminOrdersIdSnapshots(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.id },
  });
  const whereInput: Prisma.ecommerce_order_snapshotsWhereInput = {
    ecommerce_order_id: props.id,
    ...(props.body.search && {
      id: { equals: props.body.search },
    }),
  };
  const [data, totalCount] = await Promise.all([
    MyGlobal.prisma.ecommerce_order_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...EcommerceOrderSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_order_snapshots.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceOrderSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
