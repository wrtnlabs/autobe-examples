import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_organization_role(
  input?: DeepPartial<IHrmsOrganizationRole.ICreate>,
): IHrmsOrganizationRole.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    permissions: input?.permissions
      ? input.permissions.map(
          (permission) =>
            permission ??
            (() => {
              const categories = [
                "employee",
                "project",
                "task",
                "time",
                "report",
                "org",
                "contract",
                "department",
                "timesheet",
              ] as const;
              const actions = [
                "view",
                "manage",
                "create",
                "update",
                "delete",
                "approve",
                "reject",
              ] as const;
              return `${RandomGenerator.pick(categories)}:${RandomGenerator.pick(actions)}`;
            })(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => {
            const categories = [
              "employee",
              "project",
              "task",
              "time",
              "report",
              "org",
              "contract",
              "department",
              "timesheet",
            ] as const;
            const actions = [
              "view",
              "manage",
              "create",
              "update",
              "delete",
              "approve",
              "reject",
            ] as const;
            return `${RandomGenerator.pick(categories)}:${RandomGenerator.pick(actions)}`;
          },
        ),
  };
}
