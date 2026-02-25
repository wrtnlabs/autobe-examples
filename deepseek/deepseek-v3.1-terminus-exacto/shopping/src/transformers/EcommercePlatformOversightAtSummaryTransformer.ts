import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";

export namespace EcommercePlatformOversightAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_oversightsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        oversight_type: true,
        metrics_json: true,
        findings: true,
        severity_level: true,
        resolved: true,
        created_at: true,
        updated_at: true,
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_oversightsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformOversight.ISummary> {
    return {
      id: input.id,
      oversight_type: input.oversight_type,
      severity_level: input.severity_level,
      resolved: input.resolved,
      created_at: input.created_at.toISOString(),
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}
