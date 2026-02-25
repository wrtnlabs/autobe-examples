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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformEventOfSellerAtSummaryTransformer } from "../transformers/EcommercePlatformEventOfSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorSellerApprovals(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommercePlatformEventOfSeller.IRequest;
}): Promise<IPageIEcommercePlatformEventOfSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with proper null/undefined handling
  const whereInput: Prisma.ecommerce_seller_approval_queuesWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submission_date_start !== undefined &&
      props.body.submission_date_start !== null &&
      props.body.submission_date_end !== undefined &&
      props.body.submission_date_end !== null && {
        submission_date: {
          gte: new Date(props.body.submission_date_start),
          lte: new Date(props.body.submission_date_end),
        },
      }),
    ...(props.body.submission_date_start !== undefined &&
      props.body.submission_date_start !== null &&
      (props.body.submission_date_end === undefined ||
        props.body.submission_date_end === null) && {
        submission_date: { gte: new Date(props.body.submission_date_start) },
      }),
    ...((props.body.submission_date_start === undefined ||
      props.body.submission_date_start === null) &&
      props.body.submission_date_end !== undefined &&
      props.body.submission_date_end !== null && {
        submission_date: { lte: new Date(props.body.submission_date_end) },
      }),
    ...(props.body.review_start_date_start !== undefined &&
      props.body.review_start_date_start !== null &&
      props.body.review_start_date_end !== undefined &&
      props.body.review_start_date_end !== null && {
        review_start_date: {
          gte: new Date(props.body.review_start_date_start),
          lte: new Date(props.body.review_start_date_end),
        },
      }),
    ...(props.body.review_start_date_start !== undefined &&
      props.body.review_start_date_start !== null &&
      (props.body.review_start_date_end === undefined ||
        props.body.review_start_date_end === null) && {
        review_start_date: {
          gte: new Date(props.body.review_start_date_start),
        },
      }),
    ...((props.body.review_start_date_start === undefined ||
      props.body.review_start_date_start === null) &&
      props.body.review_start_date_end !== undefined &&
      props.body.review_start_date_end !== null && {
        review_start_date: { lte: new Date(props.body.review_start_date_end) },
      }),
    ...(props.body.approval_date_start !== undefined &&
      props.body.approval_date_start !== null &&
      props.body.approval_date_end !== undefined &&
      props.body.approval_date_end !== null && {
        approval_date: {
          gte: new Date(props.body.approval_date_start),
          lte: new Date(props.body.approval_date_end),
        },
      }),
    ...(props.body.approval_date_start !== undefined &&
      props.body.approval_date_start !== null &&
      (props.body.approval_date_end === undefined ||
        props.body.approval_date_end === null) && {
        approval_date: { gte: new Date(props.body.approval_date_start) },
      }),
    ...((props.body.approval_date_start === undefined ||
      props.body.approval_date_start === null) &&
      props.body.approval_date_end !== undefined &&
      props.body.approval_date_end !== null && {
        approval_date: { lte: new Date(props.body.approval_date_end) },
      }),
    ...(props.body.rejection_date_start !== undefined &&
      props.body.rejection_date_start !== null &&
      props.body.rejection_date_end !== undefined &&
      props.body.rejection_date_end !== null && {
        rejection_date: {
          gte: new Date(props.body.rejection_date_start),
          lte: new Date(props.body.rejection_date_end),
        },
      }),
    ...(props.body.rejection_date_start !== undefined &&
      props.body.rejection_date_start !== null &&
      (props.body.rejection_date_end === undefined ||
        props.body.rejection_date_end === null) && {
        rejection_date: { gte: new Date(props.body.rejection_date_start) },
      }),
    ...((props.body.rejection_date_start === undefined ||
      props.body.rejection_date_start === null) &&
      props.body.rejection_date_end !== undefined &&
      props.body.rejection_date_end !== null && {
        rejection_date: { lte: new Date(props.body.rejection_date_end) },
      }),
    ...(props.body.administrator_id && {
      ecommerce_administrator_id: props.body.administrator_id,
    }),
  };
  // Execute paginated queries sequentially
  const data = await MyGlobal.prisma.ecommerce_seller_approval_queues.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { submission_date: "desc" as const },
    ...EcommercePlatformEventOfSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_seller_approval_queues.count({
    where: whereInput,
  });
  // Transform results using asyncMap
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
  } satisfies IPageIEcommercePlatformEventOfSeller.ISummary;
}
