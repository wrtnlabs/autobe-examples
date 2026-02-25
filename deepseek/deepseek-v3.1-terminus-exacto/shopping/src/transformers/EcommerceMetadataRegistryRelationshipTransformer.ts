import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "./EcommerceSuperAdministratorAtSummaryTransformer";

export namespace EcommerceMetadataRegistryRelationshipTransformer {
  export type Payload = Prisma.ecommerce_administrative_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        general_description: true,
        created_at: true,
        updated_at: true,
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        superAdministrator:
          EcommerceSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_administrative_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistryRelationship> {
    return {
      id: input.id,
      action_type: input.action_type,
      general_description: input.general_description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      administrator: input.administrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
      super_administrator: input.superAdministrator
        ? await EcommerceSuperAdministratorAtSummaryTransformer.transform(
            input.superAdministrator,
          )
        : null,
    };
  }
}
