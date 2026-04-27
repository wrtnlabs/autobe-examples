import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking department creation data for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingDepartment.ICreate} with randomized
 * values for each property. All properties are customizable via the optional
 * `DeepPartial` input.
 *
 * The `name` is generated as a realistic two-word department name. `description`
 * receives a short explanatory paragraph. `parentId` defaults to `null` (creating
 * a top-level department) but can be overridden to establish the two-level hierarchy.
 */
export function prepare_random_hrm_time_tracking_department(
  input?: DeepPartial<IHrmTimeTrackingDepartment.ICreate> | undefined,
): IHrmTimeTrackingDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentId: input?.parentId ?? null,
  };
}
