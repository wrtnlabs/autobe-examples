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
import { EcommerceMetadataRegistryRelationshipTransformer } from "../transformers/EcommerceMetadataRegistryRelationshipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipIdSubtypesSubtypeId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Validate metadata registry existence first
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
  });
  // Validate parent relationship belongs to this registry
  const relationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findFirstOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
          deleted_at: null,
        },
      },
    );
  // Validate subtype relationship exists and belongs to parent relationship
  await MyGlobal.prisma.ecommerce_metadata_registry_relationship_of_administrators.findFirstOrThrow(
    {
      where: {
        id: props.subtypeId,
        metadata_registry_relationship_id: props.relationshipId,
      },
    },
  );
  // The metadata_registry_relationships.id IS the administrative action id (one-to-one relationship)
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: {
        id: relationship.id,
      },
      ...EcommerceMetadataRegistryRelationshipTransformer.select(),
    });
  // Optional: Verify administrator permission - only if action was performed by this administrator
  // This is a GET operation so may not require strict ownership check
  return await EcommerceMetadataRegistryRelationshipTransformer.transform(
    administrativeAction,
  );
}
