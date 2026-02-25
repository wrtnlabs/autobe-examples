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

export async function putEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IUpdate;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Validate relationship exists and belongs to the specified registry
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
  // Prepare update data
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.relationship_type !== undefined) {
    updateData.relationship_type = props.body.relationship_type;
  }
  if (props.body.relationship_direction !== undefined) {
    updateData.relationship_direction = props.body.relationship_direction;
  }
  if (props.body.relationship_description !== undefined) {
    updateData.relationship_description = props.body.relationship_description;
  }
  // Update the relationship
  const updatedRelationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.update({
      where: {
        id: props.relationshipId,
        metadata_registry_id: props.registryId,
        deleted_at: null,
      },
      data: updateData,
      ...EcommerceMetadataRegistryRelationshipTransformer.select(),
    });
  // Transform and return the result
  const result =
    await EcommerceMetadataRegistryRelationshipTransformer.transform(
      updatedRelationship,
    );
  return typia.assert<IEcommerceMetadataRegistryRelationship>(result);
}
