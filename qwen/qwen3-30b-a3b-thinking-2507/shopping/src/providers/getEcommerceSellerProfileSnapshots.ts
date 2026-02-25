import { IEcommerceCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCustomerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceCustomerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProfileSnapshots(props: {
  seller: SellerPayload;
}): Promise<IPageIEcommerceCustomerProfileSnapshot.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_customer_profile_snapshots.findMany({
      where: {
        ecommerce_customer_profile_id: props.seller.id,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCustomerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_customer_profile_snapshots.count({
      where: {
        ecommerce_customer_profile_id: props.seller.id,
        deleted_at: null,
      },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCustomerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceCustomerProfileSnapshot.ISummary;
}
