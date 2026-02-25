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
import { EcommerceMetadataRegistryCollector } from "../collectors/EcommerceMetadataRegistryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryTransformer } from "../transformers/EcommerceMetadataRegistryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorMetadataRegistries(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistry.ICreate;
}): Promise<IEcommerceMetadataRegistry> {
  // Check for existing schema_name + schema_version combination
  const existing =
    await MyGlobal.prisma.ecommerce_metadata_registries.findFirst({
      where: {
        schema_name: props.body.schema_name,
        schema_version: props.body.schema_version,
      },
    });
  if (existing) {
    throw new HttpException(
      "Metadata registry entry with this schema name and version already exists",
      400,
    );
  }
  // Create the metadata registry entry using collector
  const created = await MyGlobal.prisma.ecommerce_metadata_registries.create({
    data: await EcommerceMetadataRegistryCollector.collect({
      body: props.body,
      ecommerceAdministrators: { id: props.administrator.id },
      ecommerceAdministratorSessions: { id: props.administrator.session_id },
    }),
    ...EcommerceMetadataRegistryTransformer.select(),
  });
  // Transform and return the response
  return await EcommerceMetadataRegistryTransformer.transform(created);
}
