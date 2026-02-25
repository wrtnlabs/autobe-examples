import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the relationship exists and belongs to the specified registry
  const relationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
          deleted_at: null,
        },
      },
    );
  const now = toISOStringSafe(new Date());
  // Perform soft deletion
  await MyGlobal.prisma.ecommerce_metadata_registry_relationships.update({
    where: { id: props.relationshipId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Create audit log entry
  await MyGlobal.prisma.ecommerce_audit_logs.create({
    data: {
      id: v4(),
      super_administrator_id: props.superAdministrator.id,
      event_type: "administrative_action",
      event_subtype: "metadata_relationship_deletion",
      severity: "info",
      resource_type: "metadata_registry_relationship",
      resource_id: props.relationshipId,
      action_description: `Deleted metadata registry relationship ${props.relationshipId} from registry ${props.registryId}`,
      context_data: JSON.stringify({
        registry_id: props.registryId,
        relationship_id: props.relationshipId,
        relationship_type: relationship.relationship_type,
        relationship_direction: relationship.relationship_direction,
      }),
      success: true,
      created_at: now,
    },
  });
}
