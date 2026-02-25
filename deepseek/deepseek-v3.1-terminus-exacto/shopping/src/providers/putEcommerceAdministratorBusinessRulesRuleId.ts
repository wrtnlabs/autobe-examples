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

export async function putEcommerceAdministratorBusinessRulesRuleId(props: {
  administrator: AdministratorPayload;
  ruleId: string & tags.Format<"uuid">;
  body: IEcommercePlatformEventOfCustomer.IUpdate;
}): Promise<IEcommercePlatformEventOfCustomer> {
  // Verify the business rule exists and is not deleted
  await MyGlobal.prisma.ecommerce_business_rules.findUniqueOrThrow({
    where: {
      id: props.ruleId,
      deleted_at: null,
    },
  });
  // Build update data with only provided fields
  const updateData: Record<string, any> = {};
  if (props.body.rule_name !== undefined) {
    updateData.rule_name = props.body.rule_name;
  }
  if (props.body.rule_description !== undefined) {
    updateData.rule_description = props.body.rule_description;
  }
  if (props.body.rule_type !== undefined) {
    updateData.rule_type = props.body.rule_type;
  }
  if (props.body.configuration_json !== undefined) {
    updateData.configuration_json = JSON.stringify(
      props.body.configuration_json,
    );
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.execution_order !== undefined) {
    updateData.execution_order = props.body.execution_order;
  }
  if (props.body.version !== undefined) {
    updateData.version = props.body.version;
  }
  // Always update the timestamp
  updateData.updated_at = new Date();
  // Perform the update with transformer select for efficiency
  const updated = await MyGlobal.prisma.ecommerce_business_rules.update({
    where: { id: props.ruleId },
    data: updateData,
    ...EcommercePlatformEventOfCustomerTransformer.select(),
  });
  return await EcommercePlatformEventOfCustomerTransformer.transform(updated);
}
