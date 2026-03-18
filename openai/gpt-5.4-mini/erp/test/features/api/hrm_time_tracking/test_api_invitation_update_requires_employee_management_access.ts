import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";

export async function test_api_invitation_update_requires_employee_management_access(
  connection: api.IConnection,
): Promise<void> {
  const protectedOwnerConnection: api.IConnection = { host: connection.host };
  const protectedOwner = await api.functional.hrmTimeTracking.auth.member.join(
    protectedOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(protectedOwner);
  const protectedInvitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      protectedOwnerConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(protectedInvitation);
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMember =
    await api.functional.hrmTimeTracking.auth.member.join(
      unauthorizedConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IHrmTimeTrackingMember.IJoin,
      },
    );
  typia.assert(unauthorizedMember);
  await TestValidator.httpError(
    "unauthorized member cannot update invitation",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.update(
        unauthorizedConnection,
        {
          invitationId: protectedInvitation.id,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IHrmTimeTrackingInvitation.IUpdate,
        },
      );
    },
  );
}
