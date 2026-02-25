import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";

export namespace EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_admin_category_operationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        operation_type: true,
        category_name_before: true,
        category_description_before: true,
        parent_category_id_before: true,
        category_name_after: true,
        category_description_after: true,
        parent_category_id_after: true,
        operation_details: true,
        created_at: true,
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        category: EcommerceCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_category_operationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfigurationParameterDefinition.ISummary> {
    return {
      id: input.id,
      operation_type: input.operation_type,
      created_at: input.created_at.toISOString(),
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
