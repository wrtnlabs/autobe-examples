import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceEmailTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceEmailTemplateAtSummaryTransformer } from "../transformers/EcommerceEmailTemplateAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorEmailTemplates(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceEmailTemplate.IRequest;
}): Promise<IPageIEcommerceEmailTemplate.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput: Prisma.ecommerce_email_templatesWhereInput = {
    deleted_at: null,
    ...(props.body.code && {
      code: { contains: props.body.code, mode: "insensitive" },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.category && { category: props.body.category }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  };
  // Handle date range filtering with proper Date object conversion
  if (props.body.created_at_start || props.body.created_at_end) {
    const dateConditions: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start) {
      dateConditions.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      dateConditions.lte = new Date(props.body.created_at_end);
    }
    whereInput.created_at = dateConditions;
  }
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.ecommerce_email_templates.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceEmailTemplateAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_email_templates.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceEmailTemplateAtSummaryTransformer.transform,
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
