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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterDefinitionTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorCacheConfigurationsParameterDefinitionsDefinitionId(props: {
  superAdministrator: SuperadministratorPayload;
  definitionId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameterDefinition.IUpdate;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  // Verify super administrator exists (authorization handled by decorator but good practice)
  await MyGlobal.prisma.ecommerce_super_administrators.findUniqueOrThrow({
    where: {
      id: props.superAdministrator.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Build update data with conditional field updates
  const updateData = {
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.default_value !== undefined && {
      default_value: props.body.default_value,
    }),
    ...(props.body.validation_rules !== undefined && {
      validation_rules: props.body.validation_rules,
    }),
    ...(props.body.min_value !== undefined && {
      min_value: props.body.min_value,
    }),
    ...(props.body.max_value !== undefined && {
      max_value: props.body.max_value,
    }),
    ...(props.body.allowed_values !== undefined && {
      allowed_values: props.body.allowed_values,
    }),
    ...(props.body.pattern !== undefined && { pattern: props.body.pattern }),
    updated_at: new Date(),
  } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsUpdateInput;
  // Update and fetch in single operation
  const updatedDefinition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.update(
      {
        where: {
          id: props.definitionId,
          deleted_at: null,
        },
        data: updateData,
        ...EcommerceCacheConfigurationParameterDefinitionTransformer.select(),
      },
    );
  return await EcommerceCacheConfigurationParameterDefinitionTransformer.transform(
    updatedDefinition,
  );
}
