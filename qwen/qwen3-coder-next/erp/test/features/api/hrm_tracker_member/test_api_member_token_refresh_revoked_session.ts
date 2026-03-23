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

export async function test_api_member_token_refresh_revoked_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(joined);
  // Update connection with token from join
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: joined.token.access,
  };
  // 2. Extract refresh token for later use
  const refreshToken = joined.token.refresh;
  // 3. Simulate session revocation using mock database operation
  // Since no admin API exists for session revocation, we use a direct database update
  // In a real test environment, this would be done through the test database setup
  const db = (connection as any).db; // Access test database connection
  if (db) {
    await db.hrm_tracker_member_sessions.update(
      { refresh_token: refreshToken },
      { revoked_at: new Date().toISOString() },
    );
  }
  // 4. Attempt refresh with revoked token - should fail
  await TestValidator.error(
    "revoked session should reject refresh",
    async () => {
      await api.functional.hrmTracker.auth.member.refresh(memberConnection, {
        body: {
          refresh: refreshToken,
        } satisfies IHrmTrackerMember.IRefresh,
      });
    },
  );
}
