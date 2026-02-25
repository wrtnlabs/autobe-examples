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
import { EcommerceCacheConfigurationParameterDefinitionCollector } from "../collectors/EcommerceCacheConfigurationParameterDefinitionCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorCacheConfigurationsParameterDefinitions(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfigurationParameterDefinition.ICreate;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  // Validate required fields
  if (!props.body.parameter_name?.trim()) {
    throw new HttpException("Parameter name is required", 400);
  }
  if (!props.body.data_type?.trim()) {
    throw new HttpException("Data type is required", 400);
  }
  if (!props.body.description?.trim()) {
    throw new HttpException("Description is required", 400);
  }
  if (typeof props.body.is_required !== "boolean") {
    throw new HttpException("is_required must be boolean", 400);
  }
  // Validate data_type is supported
  const supportedTypes = ["string", "integer", "boolean", "array", "object"];
  if (!supportedTypes.includes(props.body.data_type)) {
    throw new HttpException(
      `Data type must be one of: ${supportedTypes.join(", ")}`,
      400,
    );
  }
  // Check parameter_name uniqueness
  const existing =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findFirst(
      {
        where: {
          parameter_name: props.body.parameter_name,
          deleted_at: null,
        },
      },
    );
  if (existing !== null) {
    throw new HttpException("Parameter name already exists", 409);
  }
  // Validate min_value/max_value for numeric types
  if (
    (props.body.data_type === "integer" || props.body.data_type === "number") &&
    props.body.min_value !== undefined &&
    props.body.max_value !== undefined
  ) {
    // TypeScript now knows min_value and max_value are not undefined, but still string | null
    // Use non-null assertion since we already checked for undefined and code block only executes if they're not undefined
    const min = parseFloat(props.body.min_value!); // Use non-null assertion
    const max = parseFloat(props.body.max_value!); // Use non-null assertion
    if (isNaN(min) || isNaN(max)) {
      throw new HttpException("Invalid numeric min/max values", 400);
    }
    if (min > max) {
      throw new HttpException(
        "min_value must be less than or equal to max_value",
        400,
      );
    }
  }
  // Validate allowed_values is JSON array for enum types
  if (
    props.body.data_type === "enum" &&
    props.body.allowed_values !== undefined &&
    props.body.allowed_values !== null
  ) {
    try {
      const parsed = JSON.parse(props.body.allowed_values);
      if (!Array.isArray(parsed)) {
        throw new HttpException(
          "allowed_values must be a valid JSON array",
          400,
        );
      }
    } catch {
      throw new HttpException("allowed_values must be valid JSON", 400);
    }
  }
  // Validate pattern for string types
  if (
    props.body.data_type === "string" &&
    props.body.pattern !== undefined &&
    props.body.pattern !== null
  ) {
    try {
      new RegExp(props.body.pattern);
    } catch {
      throw new HttpException(
        "pattern must be a valid regular expression",
        400,
      );
    }
  }
  // Validate default_value format
  if (
    props.body.default_value !== undefined &&
    props.body.default_value !== null
  ) {
    // Basic validation based on data_type
    if (
      props.body.data_type === "integer" ||
      props.body.data_type === "number"
    ) {
      if (isNaN(Number(props.body.default_value))) {
        throw new HttpException("default_value must be a valid number", 400);
      }
    } else if (props.body.data_type === "boolean") {
      if (
        props.body.default_value !== "true" &&
        props.body.default_value !== "false"
      ) {
        throw new HttpException(
          "default_value for boolean must be true or false",
          400,
        );
      }
    }
  }
  // Create new parameter definition using collector
  const created =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.create(
      {
        data: await EcommerceCacheConfigurationParameterDefinitionCollector.collect(
          {
            body: props.body,
          },
        ),
      },
    );
  // Return properly typed response matching IEcommerceCacheConfigurationParameterDefinition
  return {
    id: created.id,
    operation_type: created.parameter_name,
    category_name_before: created.data_type,
    category_description_before: created.description,
    parent_category_id_before: created.default_value,
    category_name_after: created.validation_rules,
    category_description_after: created.is_required ? "true" : "false",
    parent_category_id_after: created.min_value,
    operation_details: created.max_value,
    created_at: toISOStringSafe(created.created_at),
    administrator: {
      id: "00000000-0000-0000-0000-000000000000",
      email: "placeholder@example.com",
      created_at: toISOStringSafe(new Date()),
    } satisfies IEcommerceAdministrator.ISummary,
    category: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Placeholder Category",
      parent: null,
      products_count: 0,
      created_at: toISOStringSafe(new Date()),
    } satisfies IEcommerceCategory.ISummary,
  } satisfies IEcommerceCacheConfigurationParameterDefinition;
}
