import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformEventOfCustomerTransformer } from "../transformers/EcommercePlatformEventOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceSuperAdministratorBusinessRulesRuleId(props: {
  superAdministrator: SuperadministratorPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEventOfCustomer> {
  // Query the business rule using the transformer for type-safe select
  const businessRule =
    await MyGlobal.prisma.ecommerce_business_rules.findUniqueOrThrow({
      where: {
        id: props.ruleId,
        deleted_at: null, // Exclude soft-deleted rules
      },
      ...EcommercePlatformEventOfCustomerTransformer.select(),
    });
  // Transform database record to API response DTO
  return await EcommercePlatformEventOfCustomerTransformer.transform(
    businessRule,
  );
}
