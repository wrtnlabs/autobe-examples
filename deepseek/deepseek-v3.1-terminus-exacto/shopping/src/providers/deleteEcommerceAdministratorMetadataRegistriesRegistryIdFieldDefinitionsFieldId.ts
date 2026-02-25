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

export async function deleteEcommerceAdministratorMetadataRegistriesRegistryIdFieldDefinitionsFieldId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  fieldId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify field belongs to specified registry - throws 404 automatically if not found
  await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findUniqueOrThrow(
    {
      where: {
        id: props.fieldId,
        ecommerce_metadata_registry_id: props.registryId,
      },
    },
  );
  // Delete the field definition - foreign key cascade handles related data
  await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.delete({
    where: { id: props.fieldId },
  });
}
