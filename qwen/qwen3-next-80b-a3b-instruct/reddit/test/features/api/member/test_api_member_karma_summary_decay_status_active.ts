import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_karma_summary_decay_status_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to get initial karma summary
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Get initial karma summary - should be 'active' since member just joined
  const initialKarma: ICommunityBbsKarmaScore =
    await api.functional.communityBbs.member.karma.at(memberConnection);
  typia.assert(initialKarma);
  TestValidator.equals(
    "initial decay status is active",
    initialKarma.decayStatus,
    "active",
  );
  // Step 3: Wait 1 second to allow background decay calculation to process
  // In test environment, decay transition is accelerated or triggered automatically
  // We wait to allow the system to recalculate decay status based on inactivity
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Step 4: Fetch karma summary again and verify decay status changed to 'declining'
  const updatedKarma: ICommunityBbsKarmaScore =
    await api.functional.communityBbs.member.karma.at(memberConnection);
  typia.assert(updatedKarma);
  TestValidator.equals(
    "decay status transitions to declining after inactivity",
    updatedKarma.decayStatus,
    "declining",
  );
}
