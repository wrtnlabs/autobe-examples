import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAddressSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAddressesAddressIdSnapshots(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddressSnapshot.IRequest;
}): Promise<IPageIShoppingMallAddressSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
    where: {
      id: props.addressId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const sortCriteria = props.body.sort?.[0] ?? "created_at DESC";
  const sortParts = sortCriteria.split(" ");
  const field = sortParts[0] ?? "created_at";
  const direction = (sortParts[1] ?? "DESC").toLowerCase() as "asc" | "desc";
  const orderByInput = {
    [field]: direction,
  } satisfies Prisma.shopping_mall_address_snapshotsOrderByWithRelationInput;
  const whereInput = {
    shopping_mall_address_id: props.addressId,
  } satisfies Prisma.shopping_mall_address_snapshotsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_address_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAddressSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_address_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAddressSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
