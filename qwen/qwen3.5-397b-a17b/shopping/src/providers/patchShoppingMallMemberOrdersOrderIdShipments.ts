import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberOrdersOrderIdShipments(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { carrier_name: { contains: props.body.search, mode: "insensitive" } },
        {
          tracking_number: { contains: props.body.search, mode: "insensitive" },
        },
      ],
    }),
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name, mode: "insensitive" },
    }),
    ...(props.body.tracking_number && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive",
      },
    }),
    ...(props.body.shipped_from && {
      shipped_at: { gte: props.body.shipped_from },
    }),
    ...(props.body.shipped_to && {
      shipped_at: { lte: props.body.shipped_to },
    }),
    ...(props.body.delivered_from && {
      delivered_at: { gte: props.body.delivered_from, not: null },
    }),
    ...(props.body.delivered_to && {
      delivered_at: { lte: props.body.delivered_to, not: null },
    }),
    ...(props.body.is_delivered !== undefined && {
      delivered_at: props.body.is_delivered ? { not: null } : null,
    }),
  };
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" },
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallShipmentAtSummaryTransformer.transform,
  );
  const result: IPageIShoppingMallShipment.ISummary = {
    pagination: pagination,
    data: transformedData,
  };
  return result;
}
