import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_system_status(
  input?: DeepPartial<IEcommerceSystemStatus.ICreate> | undefined,
): IEcommerceSystemStatus.ICreate {
  return {
    component_name:
      input?.component_name ??
      RandomGenerator.name(2).replace(/ /g, "_").toLowerCase(),
    status:
      input?.status ??
      RandomGenerator.pick(["healthy", "warning", "unhealthy"] as const),
    health_score:
      input?.health_score ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    last_check_timestamp:
      input?.last_check_timestamp ??
      RandomGenerator.date(new Date(), 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
