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

export async function getEcommerceAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Query the administrative action (which represents the metadata registry relationship)
  const relationship =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: { id: props.relationshipId },
      ...EcommerceMetadataRegistryRelationshipTransformer.select(),
    });
  return await EcommerceMetadataRegistryRelationshipTransformer.transform(
    relationship,
  );
}
