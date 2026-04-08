import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform role creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformRole.ICreate with randomized values for
 * creating custom roles within an organization. All properties support
 * DeepPartial input override for test customization.
 *
 * The generated role includes a valid organization reference, unique role name,
 * optional description, and optional permission assignments. This function is
 * designed for testing role creation endpoints and role management workflows.
 */
export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate>,
): IHrmPlatformRole.ICreate {
  return {
    organization_id:
      input?.organization_id ?? typia.random<string & tags.Format<"uuid">>(),
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }) ?? null,
    permission_ids: input?.permission_ids
      ? input.permission_ids.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
