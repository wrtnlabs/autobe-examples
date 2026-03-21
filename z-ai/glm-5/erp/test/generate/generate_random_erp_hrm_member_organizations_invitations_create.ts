import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_invitation } from "../prepare/prepare_random_erp_hrm_invitation";

export async function generate_random_erp_hrm_member_organizations_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmInvitation.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IErpHrmInvitation> {
  const prepared: IErpHrmInvitation.ICreate = prepare_random_erp_hrm_invitation(
    props.body,
  );
  const result: IErpHrmInvitation =
    await api.functional.erpHrm.member.organizations.invitations.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
      },
    );
  return result;
}
