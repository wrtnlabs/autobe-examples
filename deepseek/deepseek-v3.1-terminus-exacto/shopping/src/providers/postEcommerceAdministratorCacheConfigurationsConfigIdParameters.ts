import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postEcommerceAdministratorCacheConfigurationsConfigIdParameters(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameterDefinition.ICreate;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  // Validate cache configuration exists and is active
  const config =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUnique({
      where: { id: props.configId, deleted_at: null },
    });
  if (!config) {
    throw new HttpException("Cache configuration not found", 404);
  }
  // Validate parameter definition exists
  const definition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findFirst(
      {
        where: { parameter_name: props.body.parameter_name, deleted_at: null },
      },
    );
  if (!definition) {
    throw new HttpException("Parameter definition not found", 404);
  }
  // Check for existing parameter value for this config and definition
  const existing =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findFirst({
      where: {
        cacheConfiguration: { id: props.configId },
        parameterDefinition: { id: definition.id },
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "Parameter value already exists for this configuration",
      409,
    );
  }
  // Apply validation rules from parameter definition
  if (definition.is_required && !props.body.default_value) {
    throw new HttpException("Parameter value is required", 400);
  }
  if (definition.min_value && props.body.default_value) {
    const minVal = parseFloat(definition.min_value);
    const inputVal = parseFloat(props.body.default_value);
    if (isNaN(minVal) || isNaN(inputVal) || inputVal < minVal) {
      throw new HttpException(
        `Parameter value must be at least ${definition.min_value}`,
        400,
      );
    }
  }
  if (definition.max_value && props.body.default_value) {
    const maxVal = parseFloat(definition.max_value);
    const inputVal = parseFloat(props.body.default_value);
    if (isNaN(maxVal) || isNaN(inputVal) || inputVal > maxVal) {
      throw new HttpException(
        `Parameter value must be at most ${definition.max_value}`,
        400,
      );
    }
  }
  if (definition.allowed_values && props.body.default_value) {
    try {
      const allowed = JSON.parse(definition.allowed_values) as string[];
      if (!allowed.includes(props.body.default_value)) {
        throw new HttpException(
          `Parameter value must be one of: ${allowed.join(", ")}`,
          400,
        );
      }
    } catch (error) {
      throw new HttpException("Invalid allowed values configuration", 500);
    }
  }
  if (definition.pattern && props.body.default_value) {
    try {
      if (!new RegExp(definition.pattern).test(props.body.default_value)) {
        throw new HttpException(
          `Parameter value must match pattern: ${definition.pattern}`,
          400,
        );
      }
    } catch (error) {
      throw new HttpException("Invalid pattern configuration", 500);
    }
  }
  // Create the parameter value record - fix type mismatch
  const parameterValue =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.create({
      data: {
        id: v4(),
        parameter_value:
          props.body.default_value !== null &&
          props.body.default_value !== undefined
            ? props.body.default_value
            : "",
        cacheConfiguration: { connect: { id: props.configId } },
        parameterDefinition: { connect: { id: definition.id } },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      include: {
        parameterDefinition: {
          select: {
            id: true,
            parameter_name: true,
            data_type: true,
            description: true,
            default_value: true,
            validation_rules: true,
            is_required: true,
            min_value: true,
            max_value: true,
            allowed_values: true,
            pattern: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // Transform the definition to match the expected response type
  const definitionData = parameterValue.parameterDefinition!;
  return {
    id: definitionData.id,
    operation_type: definitionData.parameter_name,
    category_name_before: definitionData.data_type,
    category_description_before: definitionData.description,
    parent_category_id_before:
      definitionData.default_value !== null &&
      definitionData.default_value !== undefined
        ? definitionData.default_value
        : null,
    category_name_after:
      definitionData.validation_rules !== null &&
      definitionData.validation_rules !== undefined
        ? definitionData.validation_rules
        : null,
    category_description_after: definitionData.is_required ? "true" : "false",
    parent_category_id_after:
      definitionData.min_value !== null &&
      definitionData.min_value !== undefined
        ? definitionData.min_value
        : null,
    operation_details:
      definitionData.max_value !== null &&
      definitionData.max_value !== undefined
        ? definitionData.max_value
        : null,
    created_at: toISOStringSafe(definitionData.created_at),
    administrator: {
      id: props.administrator.id,
      email: "administrator@example.com",
      created_at: toISOStringSafe(new Date()),
    },
    category: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Cache Configuration Parameter",
      parent: null,
      products_count: 0,
      created_at: toISOStringSafe(new Date()),
    },
  };
}
