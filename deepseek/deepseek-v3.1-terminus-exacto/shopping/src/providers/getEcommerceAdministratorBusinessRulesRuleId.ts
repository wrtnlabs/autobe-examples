import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformEventOfCustomerTransformer } from "../transformers/EcommercePlatformEventOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorBusinessRulesRuleId(props: {
  administrator: AdministratorPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEventOfCustomer> {
  const rule = await MyGlobal.prisma.ecommerce_business_rules.findUniqueOrThrow(
    {
      where: {
        id: props.ruleId,
        deleted_at: null,
      },
      ...EcommercePlatformEventOfCustomerTransformer.select(),
    },
  );
  return await EcommercePlatformEventOfCustomerTransformer.transform(rule);
}
