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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceAdministratorMetadataRegistriesRegistryId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if registry exists and validate its state
  const registry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findUnique({
      where: { id: props.registryId },
    });
  if (!registry) {
    throw new HttpException(
      `Metadata registry with ID ${props.registryId} not found`,
      404,
    );
  }
  if (!registry.is_active) {
    throw new HttpException(
      "Cannot delete inactive metadata registry. Please activate it first.",
      400,
    );
  }
  // Use transaction for atomic deletion
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all related field definitions
    await tx.ecommerce_metadata_registry_field_definitions.deleteMany({
      where: { ecommerce_metadata_registry_id: props.registryId },
    });
    // Delete all related relationship entries
    await tx.ecommerce_metadata_registry_relationships.deleteMany({
      where: { metadata_registry_id: props.registryId },
    });
    // Delete the main registry entry
    await tx.ecommerce_metadata_registries.delete({
      where: { id: props.registryId },
    });
    // Create audit log entry for the deletion
    await tx.ecommerce_audit_logs.create({
      data: {
        id: v4(),
        administrator_id: props.administrator.id,
        event_type: "administrative_action",
        event_subtype: "metadata_registry_deletion",
        severity: "info",
        resource_type: "ecommerce_metadata_registries",
        resource_id: props.registryId,
        action_description: "Metadata registry deleted",
        context_data: JSON.stringify({
          schema_name: registry.schema_name,
          schema_version: registry.schema_version,
          deleted_by: props.administrator.id,
          action: "metadata_registry_deleted",
        }),
        success: true,
        created_at: new Date(),
      },
    });
  });
}
