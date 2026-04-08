import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timelog creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimelog.ICreate with randomized values for
 * testing timelog creation endpoints. All required fields are populated with
 * realistic data, and optional fields are randomly included or excluded.
 *
 * The generated timelog represents a discrete period of work performed by an
 * employee on a specific project, with optional task reference and description.
 * Billable defaults to true per backend specification.
 *
 * @param input - Optional partial input for test-time customization
 * @returns Complete IHrmPlatformTimelog.ICreate object
 */
export function prepare_random_hrm_platform_timelog(
  input?: DeepPartial<IHrmPlatformTimelog.ICreate>,
): IHrmPlatformTimelog.ICreate {
  return {
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
      >(),
    hrm_platform_project_id:
      input?.hrm_platform_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_platform_task_id:
      input?.hrm_platform_task_id !== undefined
        ? input.hrm_platform_task_id
        : typia.random<boolean>()
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    description:
      input?.description !== undefined
        ? input.description
        : typia.random<boolean>()
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
    billable: input?.billable ?? true,
  };
}
