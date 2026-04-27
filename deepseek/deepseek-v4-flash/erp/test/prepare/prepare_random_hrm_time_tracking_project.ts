import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking project creation data for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingProject.ICreate} payload with
 * randomized values for all properties. The project name is generated as
 * readable text, and the color code is generated as a random hex string.
 *
 * Required properties (`name`, `color_code`) are always populated with valid
 * values. Optional properties (`description`, `budget_hours`, `started_at`,
 * `ended_at`) respect the input's null/undefined semantics — if the input
 * explicitly provides `null`, the value will be `null`; if the input omits
 * the property, a random value is generated.
 *
 * @param input - Partial input to override specific generated values
 * @returns A complete IHrmTimeTrackingProject.ICreate with all properties filled
 */
export function prepare_random_hrm_time_tracking_project(
  input?: DeepPartial<IHrmTimeTrackingProject.ICreate> | undefined,
): IHrmTimeTrackingProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    color_code:
      input?.color_code ??
      `#${ArrayUtil.repeat(6, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("")}`,
    description:
      input?.description === undefined
        ? RandomGenerator.paragraph({ sentences: 3 })
        : (input.description ?? null),
    budget_hours:
      input?.budget_hours === undefined
        ? typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
          >()
        : (input.budget_hours ?? null),
    started_at:
      input?.started_at === undefined
        ? typia.random<string & tags.Format<"date-time">>()
        : (input.started_at ?? null),
    ended_at:
      input?.ended_at === undefined
        ? typia.random<string & tags.Format<"date-time">>()
        : (input.ended_at ?? null),
  };
}
