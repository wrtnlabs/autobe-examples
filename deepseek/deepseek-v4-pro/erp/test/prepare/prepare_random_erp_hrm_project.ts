import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM project creation data for E2E testing.
 *
 * Generates a complete IErpHrmProject.ICreate with randomized values.
 * The project is created in active status by default and includes all
 * required fields: a display name, a hex color code for visual
 * identification, and optional fields for description, budget hours,
 * and timeline dates.
 *
 * Optional fields (description, budget_hours, start_date, end_date)
 * are generated with sensible defaults that can be overridden via
 * the DeepPartial input parameter. The color code is generated as a
 * valid hex color matching the `^#[0-9A-Fa-f]{6}$` pattern.
 */
export function prepare_random_erp_hrm_project(
  input?: DeepPartial<IErpHrmProject.ICreate>,
): IErpHrmProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    color_code:
      input?.color_code ??
      typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
    budget_hours:
      input?.budget_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
      >(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
