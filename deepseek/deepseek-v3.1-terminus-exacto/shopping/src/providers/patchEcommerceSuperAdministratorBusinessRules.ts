import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformEventOfCustomerAtSummaryTransformer } from "../transformers/EcommercePlatformEventOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorBusinessRules(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommercePlatformEventOfCustomer.IRequest;
}): Promise<IPageIEcommercePlatformEventOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause dynamically
  const whereInput: Prisma.ecommerce_business_rulesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      rule_description: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.rule_code && { rule_code: props.body.rule_code }),
    ...(props.body.rule_name && {
      rule_name: { contains: props.body.rule_name, mode: "insensitive" },
    }),
    ...(props.body.rule_type && { rule_type: props.body.rule_type }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_business_rules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { execution_order: "asc" },
      ...EcommercePlatformEventOfCustomerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_business_rules.count({
      where: whereInput,
    }),
  ]);
  // Transform data using ArrayUtil.asyncMap
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformEventOfCustomerAtSummaryTransformer.transform,
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
