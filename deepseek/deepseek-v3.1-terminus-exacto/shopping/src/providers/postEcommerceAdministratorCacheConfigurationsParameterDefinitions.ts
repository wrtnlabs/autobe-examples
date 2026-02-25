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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationParameterDefinitionTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorCacheConfigurationsParameterDefinitions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationParameterDefinition.ICreate;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  // Validate parameter name uniqueness
  const existingParameter =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findFirst(
      {
        where: {
          parameter_name: props.body.parameter_name,
          deleted_at: null,
        },
      },
    );
  if (existingParameter) {
    throw new HttpException("Parameter name must be unique", 400);
  }
  // Validate data_type against supported types
  const supportedDataTypes = [
    "string",
    "integer",
    "boolean",
    "array",
    "object",
  ];
  if (!supportedDataTypes.includes(props.body.data_type)) {
    throw new HttpException(
      `Data type must be one of: ${supportedDataTypes.join(", ")}`,
      400,
    );
  }
  // Validate numeric constraints for integer type
  if (props.body.data_type === "integer") {
    const minValue = props.body.min_value ? Number(props.body.min_value) : null;
    const maxValue = props.body.max_value ? Number(props.body.max_value) : null;
    if (minValue !== null && isNaN(minValue)) {
      throw new HttpException("Min value must be a valid number", 400);
    }
    if (maxValue !== null && isNaN(maxValue)) {
      throw new HttpException("Max value must be a valid number", 400);
    }
    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      throw new HttpException("Min value cannot exceed max value", 400);
    }
  }
  // Validate allowed_values format for enum parameters
  if (
    props.body.allowed_values !== undefined &&
    props.body.allowed_values !== null
  ) {
    try {
      const parsedValues = JSON.parse(props.body.allowed_values);
      if (!Array.isArray(parsedValues)) {
        throw new Error("Not an array");
      }
    } catch {
      throw new HttpException("Allowed values must be a valid JSON array", 400);
    }
  }
  // Validate regex pattern for string parameters
  if (
    props.body.pattern !== undefined &&
    props.body.pattern !== null &&
    props.body.data_type === "string"
  ) {
    try {
      new RegExp(props.body.pattern);
    } catch {
      throw new HttpException(
        "Pattern must be a valid regular expression",
        400,
      );
    }
  }
  // Create the parameter definition
  const createdDefinition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.create(
      {
        data: await EcommerceCacheConfigurationParameterDefinitionCollector.collect(
          {
            body: props.body,
          },
        ),
        ...EcommerceCacheConfigurationParameterDefinitionTransformer.select(),
      },
    );
  return await EcommerceCacheConfigurationParameterDefinitionTransformer.transform(
    createdDefinition,
  );
}
