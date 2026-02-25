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

export async function getEcommerceSuperAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // Query the field definition, ensuring it belongs to the specified registry
  const fieldDefinition =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.fieldId,
          ecommerce_metadata_registry_id: props.registryId,
        },
        ...EcommerceMetadataRegistryFieldDefinitionTransformer.select(),
      },
    );
  // Transform the database record to the response DTO
  return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
    fieldDefinition,
  );
}
