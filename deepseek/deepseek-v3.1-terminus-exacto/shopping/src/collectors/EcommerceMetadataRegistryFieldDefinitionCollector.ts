import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMetadataRegistryFieldDefinitionCollector {
  export async function collect(props: {
    body: IEcommerceMetadataRegistryFieldDefinition.ICreate;
    ecommerceMetadataRegistries: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      field_name: props.body.field_name,
      field_type: props.body.field_type,
      description: props.body.description ?? null,
      is_required: props.body.is_required,
      default_value: props.body.default_value ?? null,
      validation_rules: props.body.validation_rules ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      metadataRegistry: {
        connect: { id: props.ecommerceMetadataRegistries.id },
      },
    } satisfies Prisma.ecommerce_metadata_registry_field_definitionsCreateInput;
  }
}
