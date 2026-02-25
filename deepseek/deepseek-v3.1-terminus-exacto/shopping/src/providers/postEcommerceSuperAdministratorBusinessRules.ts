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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformEventOfCustomerTransformer } from "../transformers/EcommercePlatformEventOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorBusinessRules(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommercePlatformEventOfCustomer.ICreate;
}): Promise<IEcommercePlatformEventOfCustomer> {
  // Validate JSON configuration
  try {
    JSON.parse(props.body.configuration_json);
  } catch (error) {
    throw new HttpException("Invalid JSON configuration format", 400);
  }
  // Check for existing rule with same code
  const existingRule = await MyGlobal.prisma.ecommerce_business_rules.findFirst(
    {
      where: {
        rule_code: props.body.rule_code,
        deleted_at: null,
      },
    },
  );
  if (existingRule) {
    throw new HttpException(
      `Business rule with code '${props.body.rule_code}' already exists`,
      400,
    );
  }
  // Use collector to prepare data
  const data = await EcommercePlatformEventOfCustomerCollector.collect({
    body: props.body,
  });
  // Create the business rule
  const created = await MyGlobal.prisma.ecommerce_business_rules.create({
    data,
    ...EcommercePlatformEventOfCustomerTransformer.select(),
  });
  // Return transformed response
  return await EcommercePlatformEventOfCustomerTransformer.transform(created);
}
