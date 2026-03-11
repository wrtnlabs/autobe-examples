import { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSystemConfigurationAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_system_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        description: true,
      },
    } satisfies Prisma.ecommerce_mall_system_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSystemConfiguration.ISummary> {
    return {
      id: input.id,
      key: input.key,
      description: input.description ?? undefined,
    };
  }
}
