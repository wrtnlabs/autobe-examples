import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformEventOfSellerAtSummaryTransformer } from "../transformers/EcommercePlatformEventOfSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IEcommercePlatformEventOfSeller.IRequest;
}): Promise<IPageIEcommercePlatformEventOfSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause using string date comparisons (no Date objects)
  const whereInput: Prisma.ecommerce_seller_approval_queuesWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submission_date_start && {
      submission_date: { gte: props.body.submission_date_start },
    }),
    ...(props.body.submission_date_end && {
      submission_date: { lte: props.body.submission_date_end },
    }),
    ...(props.body.review_start_date_start && {
      review_start_date: { gte: props.body.review_start_date_start },
    }),
    ...(props.body.review_start_date_end && {
      review_start_date: { lte: props.body.review_start_date_end },
    }),
    ...(props.body.approval_date_start && {
      approval_date: { gte: props.body.approval_date_start },
    }),
    ...(props.body.approval_date_end && {
      approval_date: { lte: props.body.approval_date_end },
    }),
    ...(props.body.rejection_date_start && {
      rejection_date: { gte: props.body.rejection_date_start },
    }),
    ...(props.body.rejection_date_end && {
      rejection_date: { lte: props.body.rejection_date_end },
    }),
    ...(props.body.administrator_id && {
      ecommerce_administrator_id: props.body.administrator_id,
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_seller_approval_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submission_date: "desc" },
      ...EcommercePlatformEventOfSellerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_seller_approval_queues.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformEventOfSellerAtSummaryTransformer.transform,
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
