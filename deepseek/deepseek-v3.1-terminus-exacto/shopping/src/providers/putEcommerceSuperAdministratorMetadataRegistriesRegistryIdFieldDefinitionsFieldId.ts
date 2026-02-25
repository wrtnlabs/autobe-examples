import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.IUpdate;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // Validate that at least one field is being updated
  const updateFields = Object.keys(props.body).filter(
    (key) => props.body[key as keyof typeof props.body] !== undefined,
  );
  if (updateFields.length === 0) {
    throw new HttpException("No fields to update", 400);
  }
  // Verify the field definition exists and belongs to the specified registry
  const existingField =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.fieldId,
          ecommerce_metadata_registry_id: props.registryId,
        },
      },
    );
  // Build update data with only provided fields
  const updateData: any = {
    updated_at: new Date(),
  };
  if (props.body.field_name !== undefined) {
    updateData.field_name = props.body.field_name;
  }
  if (props.body.field_type !== undefined) {
    updateData.field_type = props.body.field_type;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description ?? null;
  }
  if (props.body.is_required !== undefined) {
    updateData.is_required = props.body.is_required;
  }
  if (props.body.default_value !== undefined) {
    updateData.default_value = props.body.default_value ?? null;
  }
  if (props.body.validation_rules !== undefined) {
    updateData.validation_rules = props.body.validation_rules ?? null;
  }
  try {
    // Update the field definition
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.update({
      where: { id: props.fieldId },
      data: updateData,
    });
  } catch (error) {
    // Handle unique constraint violation for field name
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Field name already exists in this registry",
        400,
      );
    }
    throw error;
  }
  // Fetch the complete updated field definition
  const completeField =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findUniqueOrThrow(
      {
        where: { id: props.fieldId },
        ...EcommerceMetadataRegistryFieldDefinitionTransformer.select(),
      },
    );
  return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
    completeField,
  );
}
