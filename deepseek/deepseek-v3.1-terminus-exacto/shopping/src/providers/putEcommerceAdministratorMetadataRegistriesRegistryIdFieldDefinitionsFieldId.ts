import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.IUpdate;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // Verify field exists and belongs to correct registry
  const existingField =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.fieldId,
          ecommerce_metadata_registry_id: props.registryId,
        },
      },
    );
  // Check field name uniqueness if field_name is being updated
  if (
    props.body.field_name !== undefined &&
    props.body.field_name !== existingField.field_name
  ) {
    const existingWithSameName =
      await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findFirst(
        {
          where: {
            ecommerce_metadata_registry_id: props.registryId,
            field_name: props.body.field_name,
            id: { not: props.fieldId },
          },
        },
      );
    if (existingWithSameName) {
      throw new HttpException(
        "Field name must be unique within the registry",
        400,
      );
    }
  }
  // Prepare update data with conditional assignment
  const updateData: Prisma.ecommerce_metadata_registry_field_definitionsUpdateInput =
    {
      ...(props.body.field_name !== undefined && {
        field_name: props.body.field_name,
      }),
      ...(props.body.field_type !== undefined && {
        field_type: props.body.field_type,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.is_required !== undefined && {
        is_required: props.body.is_required,
      }),
      ...(props.body.default_value !== undefined && {
        default_value: props.body.default_value,
      }),
      ...(props.body.validation_rules !== undefined && {
        validation_rules: props.body.validation_rules,
      }),
      updated_at: new Date(),
    };
  // Perform the update
  const updated =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.update({
      where: { id: props.fieldId },
      data: updateData,
      ...EcommerceMetadataRegistryFieldDefinitionTransformer.select(),
    });
  // Return transformed response
  return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
    updated,
  );
}
