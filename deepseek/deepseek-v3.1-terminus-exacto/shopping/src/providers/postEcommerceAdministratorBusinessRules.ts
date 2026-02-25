import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformEventOfCustomerCollector } from "../collectors/EcommercePlatformEventOfCustomerCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformEventOfCustomerTransformer } from "../transformers/EcommercePlatformEventOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorBusinessRules(props: {
  administrator: AdministratorPayload;
  body: IEcommercePlatformEventOfCustomer.ICreate;
}): Promise<IEcommercePlatformEventOfCustomer> {
  // Check for existing active rule with same code
  const existing = await MyGlobal.prisma.ecommerce_business_rules.findFirst({
    where: {
      rule_code: props.body.rule_code,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Business rule code already exists", 400);
  }
  // Use collector to transform DTO to database input
  const data = await EcommercePlatformEventOfCustomerCollector.collect({
    body: props.body,
  });
  // Create the business rule
  const created = await MyGlobal.prisma.ecommerce_business_rules.create({
    data,
    ...EcommercePlatformEventOfCustomerTransformer.select(),
  });
  // Transform to DTO using transformer
  return EcommercePlatformEventOfCustomerTransformer.transform(created);
}
