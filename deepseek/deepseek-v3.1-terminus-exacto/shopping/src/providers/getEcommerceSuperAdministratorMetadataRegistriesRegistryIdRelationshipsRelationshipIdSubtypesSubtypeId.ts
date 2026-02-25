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
import { EcommerceMetadataRegistryRelationshipTransformer } from "../transformers/EcommerceMetadataRegistryRelationshipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipIdSubtypesSubtypeId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Validate metadata registry exists (registryId)
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
    select: { id: true },
  });
  // Validate metadata registry relationship exists and belongs to registry (relationshipId)
  await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
    {
      where: {
        id: props.relationshipId,
        metadata_registry_id: props.registryId,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  // Check subtype relationship in each possible subtype table
  // Since response type is IEcommerceMetadataRegistryRelationship (administrative action),
  // and the administrative action table is referenced via metadata_registry_relationship_id in subtype tables,
  // we need to find subtype first, then get its linked administrative action.
  // Try administrator subtype table first
  const adminSubtype =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationship_of_administrators.findFirst(
      {
        where: {
          id: props.subtypeId,
          metadata_registry_relationship_id: props.relationshipId,
        },
        select: { metadata_registry_relationship_id: true },
      },
    );
  // If not found, try variant config subtype table
  const variantConfigSubtype = adminSubtype
    ? null
    : await MyGlobal.prisma.ecommerce_metadata_registry_relationship_of_variant_configs.findFirst(
        {
          where: {
            id: props.subtypeId,
            ecommerce_metadata_registry_relationship_id: props.relationshipId,
          },
          select: { ecommerce_metadata_registry_relationship_id: true },
        },
      );
  // If not found, try variant subtype table
  const variantSubtype =
    adminSubtype || variantConfigSubtype
      ? null
      : await MyGlobal.prisma.ecommerce_metadata_registry_relationship_of_variants.findFirst(
          {
            where: {
              id: props.subtypeId,
              ecommerce_metadata_registry_relationship_id: props.relationshipId,
            },
            select: { ecommerce_metadata_registry_relationship_id: true },
          },
        );
  // Determine the administrative action ID from the found subtype
  const administrativeActionId =
    adminSubtype?.metadata_registry_relationship_id ??
    variantConfigSubtype?.ecommerce_metadata_registry_relationship_id ??
    variantSubtype?.ecommerce_metadata_registry_relationship_id;
  if (!administrativeActionId) {
    throw new HttpException("Subtype relationship not found", 404);
  }
  // Retrieve the administrative action using the transformer
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: {
        id: administrativeActionId,
        // Validate that the action belongs to the super administrator
        OR: [
          { super_administrator_id: props.superAdministrator.id },
          { administrator_id: { in: [props.superAdministrator.id] } },
        ],
      },
      ...EcommerceMetadataRegistryRelationshipTransformer.select(),
    });
  return await EcommerceMetadataRegistryRelationshipTransformer.transform(
    administrativeAction,
  );
}
