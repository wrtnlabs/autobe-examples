import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random timelog entry for E2E testing.
 *
 * Generates a complete IHrmPlatformTimelog.ICreate with randomized values
 * including project reference, work date, duration in minutes, optional task
 * assignment, work description, and billable flag. Property values can be overridden
 * via the input parameter for targeted testing scenarios while unprovided
 * properties receive realistic random values according to their type constraints.
 *
 * @param input - Optional DeepPartial<IHrmPlatformTimelog.ICreate> to override
 *   specific properties. Properties omitted in input will be generated with
 *   realistic random values.
 * @returns A complete IHrmPlatformTimelog.ICreate with all required properties
 *   generated and optional properties either taken from input or randomly generated.
 */
export function prepare_random_hrm_platform_timelog(
  input?: DeepPartial<IHrmPlatformTimelog.ICreate>,
): IHrmPlatformTimelog.ICreate {
  return {
    billable: input?.billable ?? RandomGenerator.pick([true, false] as const),
    date:
      input?.date ??
      RandomGenerator.date(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    durationMinutes:
      input?.durationMinutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId:
      input?.taskId ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    workDescription:
      input?.workDescription ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
