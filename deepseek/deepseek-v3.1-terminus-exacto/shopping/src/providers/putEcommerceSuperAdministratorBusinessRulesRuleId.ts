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

export async function putEcommerceSuperAdministratorBusinessRulesRuleId(props: {
  superAdministrator: SuperadministratorPayload;
  ruleId: string & tags.Format<"uuid">;
  body: IEcommercePlatformEventOfCustomer.IUpdate;
}): Promise<IEcommercePlatformEventOfCustomer> {
  // Find existing business rule
  const existingRule =
    await MyGlobal.prisma.ecommerce_business_rules.findUnique({
      where: { id: props.ruleId },
    });
  if (!existingRule) {
    throw new HttpException("Business rule not found", 404);
  }
  if (existingRule.deleted_at !== null) {
    throw new HttpException("Business rule has been deleted", 410);
  }
  // Validate configuration_json if provided
  if (props.body.configuration_json !== undefined) {
    try {
      // The configuration_json is already a string, we need to validate it's valid JSON
      const parsed = JSON.parse(String(props.body.configuration_json));
      // Ensure it's an object (not array, string, etc.)
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new HttpException(
          "Configuration JSON must be a valid object",
          400,
        );
      }
    } catch {
      throw new HttpException("Invalid JSON configuration", 400);
    }
  }
  // Validate execution_order if provided
  if (
    props.body.execution_order !== undefined &&
    props.body.execution_order < 0
  ) {
    throw new HttpException("Execution order must be non-negative", 400);
  }
  // Prepare update data
  const updateData: Prisma.ecommerce_business_rulesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Apply partial updates to allowed fields
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
    updateData.configuration_json = props.body.configuration_json;
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
  // Update the business rule
  const updatedRule = await MyGlobal.prisma.ecommerce_business_rules.update({
    where: { id: props.ruleId },
    data: updateData,
    ...EcommercePlatformEventOfCustomerTransformer.select(),
  });
  // Transform and return the updated entity
  return await EcommercePlatformEventOfCustomerTransformer.transform(
    updatedRule,
  );
}
