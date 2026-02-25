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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMetadataRegistryTransformer } from "../transformers/EcommerceMetadataRegistryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorMetadataRegistries(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMetadataRegistry.ICreate;
}): Promise<IEcommerceMetadataRegistry> {
  const created = await MyGlobal.prisma.ecommerce_metadata_registries.create({
    data: await EcommerceMetadataRegistryCollector.collect({
      body: props.body,
      ecommerceAdministrators: props.superAdministrator,
      ecommerceAdministratorSessions: {
        id: props.superAdministrator.session_id,
      },
    }),
    ...EcommerceMetadataRegistryTransformer.select(),
  });
  return await EcommerceMetadataRegistryTransformer.transform(created);
}
