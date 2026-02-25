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
import { EcommerceCacheConfigurationParameterDefinitionTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putEcommerceAdministratorCacheConfigurationsParameterDefinitionsDefinitionId(props: {
  administrator: AdministratorPayload;
  definitionId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameterDefinition.IUpdate;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  // Verify the parameter definition exists
  await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findUniqueOrThrow(
    {
      where: { id: props.definitionId },
    },
  );
  // Build update data with explicit null handling
  const updateData: Prisma.ecommerce_cache_configuration_parameter_definitionsUpdateInput =
    {
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      default_value:
        props.body.default_value === undefined
          ? undefined
          : props.body.default_value,
      validation_rules:
        props.body.validation_rules === undefined
          ? undefined
          : props.body.validation_rules,
      min_value:
        props.body.min_value === undefined ? undefined : props.body.min_value,
      max_value:
        props.body.max_value === undefined ? undefined : props.body.max_value,
      allowed_values:
        props.body.allowed_values === undefined
          ? undefined
          : props.body.allowed_values,
      pattern:
        props.body.pattern === undefined ? undefined : props.body.pattern,
      updated_at: new Date(),
    };
  // Update the record
  await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.update(
    {
      where: { id: props.definitionId },
      data: updateData,
    },
  );
  // Fetch the updated record with complete data using the transformer's select
  const updated =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findUniqueOrThrow(
      {
        where: { id: props.definitionId },
        ...EcommerceCacheConfigurationParameterDefinitionTransformer.select(),
      },
    );
  // Transform using the transformer
  return await EcommerceCacheConfigurationParameterDefinitionTransformer.transform(
    updated,
  );
}
