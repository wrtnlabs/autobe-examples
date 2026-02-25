import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformEventOfCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_business_rulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rule_code: true,
        rule_name: true,
        rule_description: true,
        rule_type: true,
        configuration_json: true,
        is_active: true,
        execution_order: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_business_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformEventOfCustomer.ISummary> {
    return {
      id: input.id,
      rule_code: input.rule_code,
      rule_name: input.rule_name,
      rule_description: input.rule_description,
      rule_type: input.rule_type,
      is_active: input.is_active,
      execution_order: input.execution_order,
      version: input.version,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
