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

export async function deleteEcommerceSuperAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify that the metadata registry exists
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
  });
  // Delete the field definition with both registry and field ID verification
  await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.delete({
    where: {
      id: props.fieldId,
      ecommerce_metadata_registry_id: props.registryId,
    },
  });
}
