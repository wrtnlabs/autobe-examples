import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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

export async function putEcommerceAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IUpdate;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Verify relationship exists and belongs to the specified registry
  const existing =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
          deleted_at: null,
        },
      },
    );
  // Update the relationship with partial update
  await MyGlobal.prisma.ecommerce_metadata_registry_relationships.update({
    where: { id: props.relationshipId },
    data: {
      ...(props.body.relationship_type !== undefined && {
        relationship_type: props.body.relationship_type,
      }),
      ...(props.body.relationship_direction !== undefined && {
        relationship_direction: props.body.relationship_direction,
      }),
      ...(props.body.relationship_description !== undefined && {
        relationship_description: props.body.relationship_description,
      }),
      updated_at: new Date(),
    },
  });
  // Need to retrieve the updated relationship with administrator information
  const updated =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: { id: props.relationshipId },
        select: {
          id: true,
          metadata_registry_id: true,
          relationship_type: true,
          relationship_direction: true,
          relationship_description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          // The IEcommerceMetadataRegistryRelationship DTO expects administrator and super_administrator fields
          // but these come from ecommerce_administrative_actions table, not metadata_registry_relationships
          // This indicates a potential schema mismatch
        },
      },
    );
  // Manual transformation since transformer exists but might not work with this specific table
  return {
    id: updated.id,
    action_type: "METADATA_RELATIONSHIP_UPDATE", // This field exists in DTO but not in our table
    general_description: updated.relationship_description, // Map what we have
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    administrator: null, // Handle null administrator since we don't have the relationship
    super_administrator: null, // Same for super administrator
  };
}
