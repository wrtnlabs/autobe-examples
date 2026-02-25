import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationSnapshotAtSummaryTransformer } from "../transformers/EcommerceCacheConfigurationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdminSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationSnapshot.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition with comprehensive filtering
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.suspension_start_date_min && {
      suspension_start_date: {
        gte: new Date(props.body.suspension_start_date_min),
      },
    }),
    ...(props.body.suspension_start_date_max && {
      suspension_start_date: {
        lte: new Date(props.body.suspension_start_date_max),
      },
    }),
    ...(props.body.suspension_end_date_min && {
      suspension_end_date: {
        gte: new Date(props.body.suspension_end_date_min),
      },
    }),
    ...(props.body.suspension_end_date_max && {
      suspension_end_date: {
        lte: new Date(props.body.suspension_end_date_max),
      },
    }),
    ...(props.body.seller_email && {
      seller: {
        email: props.body.seller_email,
      } satisfies Prisma.ecommerce_sellersWhereInput,
    }),
    ...(props.body.administrator_email && {
      administrator: {
        email: props.body.administrator_email,
      } satisfies Prisma.ecommerce_administratorsWhereInput,
    }),
    ...(props.body.suspension_reason_search && {
      suspension_reason: {
        contains: props.body.suspension_reason_search,
      },
    }),
  } satisfies Prisma.ecommerce_admin_seller_suspensionsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_admin_seller_suspensions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { suspension_start_date: "desc" as const },
      ...EcommerceCacheConfigurationSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_admin_seller_suspensions.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCacheConfigurationSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
