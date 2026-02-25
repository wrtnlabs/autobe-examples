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

export async function deleteEcommerceAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the metadata registry exists first
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
    select: { id: true },
  });
  // Verify the relationship exists and belongs to the specified registry
  const relationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
        },
        select: {
          id: true,
          relationship_type: true,
          relationship_description: true,
        },
      },
    );
  // Perform hard deletion - database cascade constraints will handle subtype records
  await MyGlobal.prisma.ecommerce_metadata_registry_relationships.delete({
    where: { id: relationship.id },
  });
  // Create audit log entry using correct Prisma field names based on schema
  await MyGlobal.prisma.ecommerce_audit_logs.create({
    data: {
      id: v4(),
      administrator_id: props.administrator.id,
      event_type: "administrative_action",
      event_subtype: "metadata_registry_relationship_deletion",
      severity: "info",
      action_description: `Deleted metadata registry relationship ${relationship.id} (${relationship.relationship_type})`,
      resource_type: "metadata_registry_relationship",
      resource_id: relationship.id,
      success: true,
      created_at: new Date(),
    },
  });
}
