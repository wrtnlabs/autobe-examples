import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryTransformer } from "../transformers/EcommerceMetadataRegistryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdministratorMetadataRegistriesRegistryId(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistry.IUpdate;
}): Promise<IEcommerceMetadataRegistry> {
  // First, verify the registry exists
  const existingRegistry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
      where: { id: props.registryId },
    });
  // Validate semantic versioning format if schema_version is provided
  if (props.body.schema_version !== undefined) {
    const semverRegex =
      /^\d+\.\d+\.\d+(-[\da-z\-]+(\.[\da-z\-]+)*)?(\+[\da-z\-]+(\.[\da-z\-]+)*)?$/i;
    if (!semverRegex.test(props.body.schema_version)) {
      throw new HttpException("Invalid semantic version format", 400);
    }
  }
  // Build update data object with only provided fields
  const updateData: Prisma.ecommerce_metadata_registriesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.schema_name !== undefined) {
    updateData.schema_name = props.body.schema_name;
  }
  if (props.body.schema_version !== undefined) {
    updateData.schema_version = props.body.schema_version;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Update the registry entry
  const updatedRegistry =
    await MyGlobal.prisma.ecommerce_metadata_registries.update({
      where: { id: props.registryId },
      data: updateData,
      ...EcommerceMetadataRegistryTransformer.select(),
    });
  return await EcommerceMetadataRegistryTransformer.transform(updatedRegistry);
}
