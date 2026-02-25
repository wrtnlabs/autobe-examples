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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceEmailTemplateAtSummaryTransformer } from "../transformers/EcommerceEmailTemplateAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorEmailTemplates(props: {
  administrator: AdministratorPayload;
  body: IEcommerceEmailTemplate.IRequest;
}): Promise<IPageIEcommerceEmailTemplate.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.code && {
      code: { contains: props.body.code, mode: "insensitive" as const },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.category && { category: props.body.category }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  } satisfies Prisma.ecommerce_email_templatesWhereInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_email_templates.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommerceEmailTemplateAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_email_templates.count({
      where: whereInput,
    }),
  ]);
  // Transform data
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
