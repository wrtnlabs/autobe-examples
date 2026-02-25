import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCacheConfigurationParameterCollector } from "../collectors/EcommerceCacheConfigurationParameterCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterTransformer } from "../transformers/EcommerceCacheConfigurationParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorCacheConfigurationsConfigIdParameters(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameter.ICreate;
}): Promise<IEcommerceCacheConfigurationParameter> {
  // Validate cache configuration exists and is active
  const config =
    await MyGlobal.prisma.ecommerce_cache_configurations.findFirstOrThrow({
      where: { id: props.configId, deleted_at: null },
    });
  // Validate parameter definition exists and is active
  const paramDef =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findFirstOrThrow(
      {
        where: {
          id: props.body.ecommerce_cache_configuration_parameter_definition_id,
          deleted_at: null,
        },
      },
    );
  // Check for existing parameter value with same config and definition
  const existingParam =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findFirst({
      where: {
        ecommerce_cache_configuration_id: props.configId,
        ecommerce_cache_configuration_parameter_definition_id:
          props.body.ecommerce_cache_configuration_parameter_definition_id,
        deleted_at: null,
      },
    });
  if (existingParam) {
    throw new HttpException(
      "Parameter value already exists for this configuration and definition",
      400,
    );
  }
  // Apply validation rules from parameter definition
  await validateParameterValue(paramDef, props.body.parameter_value);
  // Create parameter using collector
  const created =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.create({
      data: await EcommerceCacheConfigurationParameterCollector.collect({
        body: props.body,
        ecommerceCacheConfigurations: { id: props.configId },
      }),
      ...EcommerceCacheConfigurationParameterTransformer.select(),
    });
  // Transform response using transformer
  return await EcommerceCacheConfigurationParameterTransformer.transform(
    created,
  );
}
async function validateParameterValue(
  definition: any,
  value: string,
): Promise<void> {
  // Check required field
  if (definition.is_required && (!value || value.trim().length === 0)) {
    throw new HttpException(
      `Parameter value is required for '${definition.parameter_name}'`,
      400,
    );
  }
  // Skip validation if value is empty and not required
  if (!value || value.trim().length === 0) {
    return;
  }
  // Validate based on data type
  switch (definition.data_type) {
    case "integer":
      if (!/^-?\d+$/.test(value)) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be an integer`,
          400,
        );
      }
      const intValue = parseInt(value, 10);
      if (definition.min_value !== null && intValue < definition.min_value) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be at least ${definition.min_value}`,
          400,
        );
      }
      if (definition.max_value !== null && intValue > definition.max_value) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be at most ${definition.max_value}`,
          400,
        );
      }
      break;
    case "decimal":
      if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be a decimal number`,
          400,
        );
      }
      const decimalValue = parseFloat(value);
      if (
        definition.min_value !== null &&
        decimalValue < definition.min_value
      ) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be at least ${definition.min_value}`,
          400,
        );
      }
      if (
        definition.max_value !== null &&
        decimalValue > definition.max_value
      ) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be at most ${definition.max_value}`,
          400,
        );
      }
      break;
    case "boolean":
      if (!["true", "false", "1", "0"].includes(value.toLowerCase())) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must be a boolean value (true/false)`,
          400,
        );
      }
      break;
    case "string":
      if (
        definition.min_length !== null &&
        value.length < definition.min_length
      ) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must contain at least ${definition.min_length} characters`,
          400,
        );
      }
      if (
        definition.max_length !== null &&
        value.length > definition.max_length
      ) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must contain at most ${definition.max_length} characters`,
          400,
        );
      }
      if (
        definition.pattern !== null &&
        !new RegExp(definition.pattern).test(value)
      ) {
        throw new HttpException(
          `Parameter '${definition.parameter_name}' must match pattern: ${definition.pattern}`,
          400,
        );
      }
      break;
    case "enum":
      if (definition.allowed_values !== null) {
        const allowed = definition.allowed_values
          .split(",")
          .map((v: string) => v.trim());
        if (!allowed.includes(value)) {
          throw new HttpException(
            `Parameter '${definition.parameter_name}' must be one of: ${allowed.join(", ")}`,
            400,
          );
        }
      }
      break;
  }
}
