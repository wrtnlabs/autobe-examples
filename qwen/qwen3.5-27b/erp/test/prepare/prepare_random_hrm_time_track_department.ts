import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track department creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackDepartment.ICreate with randomized values.
 * The department name is generated as a realistic name-like string, description
 * as a short paragraph, and parent_department_id as a UUID when specified.
 * All fields can be overridden via the input parameter for specific test scenarios.
 */
export function prepare_random_hrm_time_track_department(
  input?: DeepPartial<IHrmTimeTrackDepartment.ICreate> | undefined,
): IHrmTimeTrackDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parent_department_id:
      input?.parent_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
