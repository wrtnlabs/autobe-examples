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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMetadataRegistryTransformer } from "../transformers/EcommerceMetadataRegistryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorMetadataRegistriesRegistryId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistry.IUpdate;
}): Promise<IEcommerceMetadataRegistry> {
  // Verify registry exists and belongs to accessible scope
  const existingRegistry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findFirstOrThrow({
      where: { id: props.registryId },
    });
  // Validate semantic version format if provided
  if (props.body.schema_version !== undefined) {
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    if (!semverRegex.test(props.body.schema_version)) {
      throw new HttpException(
        "Schema version must follow semantic versioning format (e.g., 1.0.0, 2.1.3-beta.1)",
        400,
      );
    }
  }
  // Prepare update data with conditional assignment and proper null handling
  const updateData: Prisma.ecommerce_metadata_registriesUpdateInput = {};
  if (props.body.schema_name !== undefined)
    updateData.schema_name = props.body.schema_name;
  if (props.body.schema_version !== undefined)
    updateData.schema_version = props.body.schema_version;
  // Handle description field: null should clear the field, undefined leaves unchanged
  if ("description" in props.body) {
    updateData.description = props.body.description;
  }
  if (props.body.is_active !== undefined)
    updateData.is_active = props.body.is_active;
  // Always update the timestamp
  updateData.updated_at = new Date();
  // Perform update with transformer select for complete response
  const updated = await MyGlobal.prisma.ecommerce_metadata_registries.update({
    where: { id: props.registryId },
    data: updateData,
    ...EcommerceMetadataRegistryTransformer.select(),
  });
  return await EcommerceMetadataRegistryTransformer.transform(updated);
}
