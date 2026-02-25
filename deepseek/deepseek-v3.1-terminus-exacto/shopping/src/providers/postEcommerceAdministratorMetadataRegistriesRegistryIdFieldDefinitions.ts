import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMetadataRegistryFieldDefinitionCollector } from "../collectors/EcommerceMetadataRegistryFieldDefinitionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorMetadataRegistriesRegistryIdFieldDefinitions(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.ICreate;
}): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  // Verify parent metadata registry exists
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: {
      id: props.registryId,
    },
  });
  try {
    // Create field definition using collector
    const fieldDefinition =
      await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.create(
        {
          data: await EcommerceMetadataRegistryFieldDefinitionCollector.collect(
            {
              body: props.body,
              ecommerceMetadataRegistries: { id: props.registryId },
            },
          ),
          ...EcommerceMetadataRegistryFieldDefinitionTransformer.select(),
        },
      );
    return await EcommerceMetadataRegistryFieldDefinitionTransformer.transform(
      fieldDefinition,
    );
  } catch (error) {
    // Handle unique constraint violation for field_name within registry
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Field name already exists in this registry",
        409,
      );
    }
    throw error;
  }
}
