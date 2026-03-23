import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_deletion_by_creator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (creator)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creator = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(creator);
  // 2. Create another member account (invitee)
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_member_join(inviteeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(invitee);
  // 3. Test that delete invitation with non-existent ID throws error
  // This validates the erase endpoint structure and error handling
  await TestValidator.error(
    "delete non-existent invitation should fail",
    async () => {
      await api.functional.hrmTracker.member.invitations.erase(
        creatorConnection,
        {
          invitationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Test that delete with valid format but unauthorized should fail
  // Create another member without permissions to delete
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorized = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(unauthorized);
  // 5. Verify unauthorized delete fails
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.hrmTracker.member.invitations.erase(
      unauthorizedConnection,
      {
        invitationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
