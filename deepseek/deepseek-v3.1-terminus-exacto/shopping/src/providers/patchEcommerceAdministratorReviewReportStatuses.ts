import { IEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewReportStatuses(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewReportStatus.IRequest;
}): Promise<IPageIEcommerceReviewReportStatus> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_review_report_statusesWhereInput = {
    ...(props.body.ecommerce_review_report_id && {
      ecommerce_review_report_id: props.body.ecommerce_review_report_id,
    }),
    ...(props.body.ecommerce_administrator_id && {
      ecommerce_administrator_id: props.body.ecommerce_administrator_id,
    }),
    ...(props.body.previous_status && {
      previous_status: props.body.previous_status,
    }),
    ...(props.body.new_status && {
      new_status: props.body.new_status,
    }),
    ...(props.body.search && {
      transition_reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...((props.body.created_start || props.body.created_end) && {
      created_at: {
        ...(props.body.created_start && { gte: props.body.created_start }),
        ...(props.body.created_end && { lte: props.body.created_end }),
      },
    }),
  };
  const orderByInput: Prisma.ecommerce_review_report_statusesOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" };
  // Sequential execution instead of Promise.all
  const data = await MyGlobal.prisma.ecommerce_review_report_statuses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      previous_status: true,
      new_status: true,
      transition_reason: true,
      ecommerce_review_report_id: true,
      ecommerce_administrator_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_review_report_statuses.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const transformedData: IEcommerceReviewReportStatus[] = data.map(
    (record) => ({
      previous_status: record.previous_status,
      new_status: record.new_status,
      transition_reason:
        record.transition_reason === null
          ? undefined
          : record.transition_reason,
      ecommerce_review_report_id: record.ecommerce_review_report_id as string &
        tags.Format<"uuid">,
      ecommerce_administrator_id:
        record.ecommerce_administrator_id === null
          ? undefined
          : (record.ecommerce_administrator_id as string & tags.Format<"uuid">),
    }),
  );
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIEcommerceReviewReportStatus;
}
