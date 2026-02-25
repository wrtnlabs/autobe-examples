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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Query the specific relationship with registry validation
  const relationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
          deleted_at: null,
        },
        select: {
          id: true,
          relationship_type: true,
          relationship_description: true,
          created_at: true,
          updated_at: true,
          metadataRegistry: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  // Transform to match the IEcommerceMetadataRegistryRelationship DTO structure
  return {
    id: relationship.id,
    action_type: relationship.relationship_type,
    general_description: relationship.relationship_description,
    created_at: toISOStringSafe(relationship.created_at),
    updated_at: toISOStringSafe(relationship.updated_at),
    administrator: null, // No administrator relationship in this table
    super_administrator: null, // No super administrator relationship in this table
  };
}
