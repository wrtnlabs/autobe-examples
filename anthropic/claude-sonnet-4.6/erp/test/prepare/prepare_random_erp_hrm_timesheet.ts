import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timesheet(
  input?: DeepPartial<IErpHrmTimesheet.ICreate> | undefined,
): IErpHrmTimesheet.ICreate {
  const referenceMonday = new Date("2024-01-01T00:00:00.000Z");
  const randomWeeks = typia.random<
    number & tags.Type<"uint32"> & tags.Maximum<104>
  >();
  const computedMonday = new Date(
    referenceMonday.getTime() + randomWeeks * 7 * 24 * 60 * 60 * 1000,
  );
  const weekStartDate = input?.weekStartDate ?? computedMonday.toISOString();
  const weekEndDateComputed = new Date(
    new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    weekStartDate,
    weekEndDate: input?.weekEndDate ?? weekEndDateComputed,
  };
}
