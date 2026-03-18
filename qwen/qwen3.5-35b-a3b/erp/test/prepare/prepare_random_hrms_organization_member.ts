import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_organization_member(
  input?: DeepPartial<IHrmsOrganizationMember.ICreate>,
): IHrmsOrganizationMember.ICreate {
  return {
    hrms_member_id:
      input?.hrms_member_id ?? typia.random<string & tags.Format<"uuid">>(),
    hrms_organization_id:
      input?.hrms_organization_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrms_organization_role_id:
      input?.hrms_organization_role_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
