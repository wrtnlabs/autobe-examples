import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_role(
  input?: DeepPartial<IHrmTrackerRole.ICreate>,
): IHrmTrackerRole.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: Math.floor(Math.random() * 3) + 1,
        wordMin: 3,
        wordMax: 6,
      }),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({
            sentences: Math.floor(Math.random() * 4) + 1,
            wordMin: 5,
            wordMax: 10,
          })
        : null),
    permissions: input?.permissions
      ? input.permissions.map((p) => p ?? RandomGenerator.alphabets(8))
      : ArrayUtil.repeat(Math.floor(Math.random() * 3) + 1, () =>
          RandomGenerator.alphabets(8),
        ),
  };
}
