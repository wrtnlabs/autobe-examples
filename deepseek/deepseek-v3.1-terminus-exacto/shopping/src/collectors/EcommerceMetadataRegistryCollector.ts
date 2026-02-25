import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMetadataRegistryCollector {
  export async function collect(props: {
    body: IEcommerceMetadataRegistry.ICreate;
    ecommerceAdministrators: IEntity;
    ecommerceAdministratorSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      schema_name: props.body.schema_name,
      schema_version: props.body.schema_version,
      description: props.body.description ?? null,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      systemSetting: undefined,
      auditLog: undefined,
      dbMigration: undefined,
      fieldDefinitions: undefined,
      relationships: undefined,
      categoryRelationships: undefined,
    } satisfies Prisma.ecommerce_metadata_registriesCreateInput;
  }
}
