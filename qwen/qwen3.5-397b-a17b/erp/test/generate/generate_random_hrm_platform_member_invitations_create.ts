import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_invitation } from "../prepare/prepare_random_hrm_platform_invitation";

export async function generate_random_hrm_platform_member_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformInvitation.ICreate>;
  },
): Promise<IHrmPlatformInvitation> {
  const prepared: IHrmPlatformInvitation.ICreate =
    prepare_random_hrm_platform_invitation(props.body);
  const result: IHrmPlatformInvitation =
    await api.functional.hrmPlatform.member.invitations.create(connection, {
      body: prepared,
    });
  return result;
}
