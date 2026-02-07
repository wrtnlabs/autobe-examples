import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSystemConfigAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_system_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_system_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSystemConfig.ISummary> {
    return {
      id: input.id,
      key: input.key,
      description: input.description,
      created_at: input.created_at.toISOString(),
    };
  }
}
