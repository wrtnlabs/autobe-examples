import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // verify the field definition belongs to the specified registry
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
  return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
    fieldDefinition,
  );
}
