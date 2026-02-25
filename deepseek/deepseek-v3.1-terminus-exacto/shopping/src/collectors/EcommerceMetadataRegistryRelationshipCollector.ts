import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMetadataRegistryRelationshipCollector {
  export async function collect(props: {
    body: IEcommerceMetadataRegistryRelationship.ICreate;
    ecommerceAdministrators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: props.body.action_type,
      general_description: props.body.general_description,
      created_at: new Date(),
      updated_at: new Date(),
      administrator: { connect: { id: props.ecommerceAdministrators.id } },
      superAdministrator: props.body.super_administrator_id
        ? { connect: { id: props.body.super_administrator_id } }
        : undefined,
    } satisfies Prisma.ecommerce_administrative_actionsCreateInput;
  }
}
