import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryLifecycle";
export function prepare_random_community_platform_inventory_lifecycle(
  input?: DeepPartial<ICommunityPlatformInventoryLifecycle.ICreate>,
): ICommunityPlatformInventoryLifecycle.ICreate {
  return {
    inventory_item_id:
      input?.inventory_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    lifecycle_stage:
      input?.lifecycle_stage ??
      RandomGenerator.pick([
        "procurement",
        "in_transit",
        "in_stock",
        "in_use",
        "maintenance",
        "disposed",
      ] as const),
    vendor_id: input?.vendor_id ?? typia.random<string & tags.Format<"uuid">>(),
    procurement_date: input?.procurement_date ?? new Date().toISOString(),
    notes:
      input?.notes ?? RandomGenerator.paragraph({ sentences: 1, wordMax: 20 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "procurement",
        "in_transit",
        "in_stock",
        "in_use",
        "maintenance",
        "disposed",
        "consumed",
        "returned",
      ] as const),
    estimated_end_date:
      input?.estimated_end_date ??
      RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000).toISOString(),
    disposition_reason: undefined,
  };
}