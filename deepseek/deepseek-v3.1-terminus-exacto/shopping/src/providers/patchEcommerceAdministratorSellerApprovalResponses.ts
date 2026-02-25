import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApprovalResponse";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSellerApprovalResponseAtSummaryTransformer } from "../transformers/EcommerceSellerApprovalResponseAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorSellerApprovalResponses(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSellerApprovalResponse.IRequest;
}): Promise<IPageIEcommerceSellerApprovalResponse.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filters
  const whereInput: Prisma.ecommerce_seller_approval_responsesWhereInput = {
    ...(props.body.decision && { decision: props.body.decision }),
    ...(props.body.administrator_id && {
      administrator_id: props.body.administrator_id,
    }),
  };
  // Handle date range filters properly
  if (props.body.responded_at_start || props.body.responded_at_end) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.responded_at_start) {
      dateFilter.gte = new Date(props.body.responded_at_start);
    }
    if (props.body.responded_at_end) {
      dateFilter.lte = new Date(props.body.responded_at_end);
    }
    whereInput.responded_at = dateFilter;
  }
  // Remove reason filter since 'reason' property doesn't exist in IRequest
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_seller_approval_responses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { responded_at: "desc" },
      ...EcommerceSellerApprovalResponseAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_seller_approval_responses.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSellerApprovalResponseAtSummaryTransformer.transform,
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
