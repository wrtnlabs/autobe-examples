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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorBusinessRules(props: {
  administrator: AdministratorPayload;
  body: IEcommercePlatformEventOfCustomer.IRequest;
}): Promise<IPageIEcommercePlatformEventOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          rule_description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        { rule_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.rule_code && { rule_code: props.body.rule_code }),
    ...(props.body.rule_name && {
      rule_name: { contains: props.body.rule_name, mode: "insensitive" },
    }),
    ...(props.body.rule_type && { rule_type: props.body.rule_type }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  } satisfies Prisma.ecommerce_business_rulesWhereInput;
  const orderByInput = {
    execution_order: "asc" as const,
  } satisfies Prisma.ecommerce_business_rulesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_business_rules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    }),
    MyGlobal.prisma.ecommerce_business_rules.count({ where: whereInput }),
  ]);
  return {
    data: data.map(
      (rule) =>
        ({
          id: rule.id as string & tags.Format<"uuid">,
          rule_code: rule.rule_code,
          rule_name: rule.rule_name,
          rule_description: rule.rule_description,
          rule_type: rule.rule_type,
          is_active: rule.is_active,
          execution_order: rule.execution_order,
          version: rule.version,
          created_at: rule.created_at.toISOString(),
          updated_at: rule.updated_at.toISOString(),
        }) satisfies IEcommercePlatformEventOfCustomer.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
