import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMetadataRegistryFieldDefinitionCollector } from "../collectors/EcommerceMetadataRegistryFieldDefinitionCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorMetadataRegistriesRegistryIdFieldDefinitions(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.ICreate;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // Validate parent metadata registry exists and is active (not deleted)
  const registry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findUnique({
      where: {
        id: props.registryId,
      },
    });
  if (!registry) {
    throw new HttpException("Metadata registry not found", 404);
  }
  if (!registry.is_active) {
    throw new HttpException("Metadata registry is deleted", 404);
  }
  // Check field name uniqueness within this registry
  const existingField =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findFirst(
      {
        where: {
          ecommerce_metadata_registry_id: props.registryId,
          field_name: props.body.field_name,
        },
      },
    );
  if (existingField) {
    throw new HttpException(
      `Field "${props.body.field_name}" already exists in this metadata registry`,
      409,
    );
  }
  // Optional JSON validation for validation_rules parameter
  if (props.body.validation_rules && props.body.validation_rules !== null) {
    try {
      JSON.parse(props.body.validation_rules);
    } catch {
      throw new HttpException(
        "Invalid JSON in validation_rules parameter",
        400,
      );
    }
  }
  // Use collector to create data input
  const fieldInput =
    await EcommerceMetadataRegistryFieldDefinitionCollector.collect({
      body: props.body,
      ecommerceMetadataRegistries: { id: props.registryId },
    });
  // Create the field definition
  const createdField =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.create({
      data: fieldInput,
      ...EcommerceMetadataRegistryFieldDefinitionTransformer.select(),
    });
  // Transform and return
  return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
    createdField,
  );
}
