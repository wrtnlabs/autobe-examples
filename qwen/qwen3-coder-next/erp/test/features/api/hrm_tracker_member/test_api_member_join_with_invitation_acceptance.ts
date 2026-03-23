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

export async function test_api_member_join_with_invitation_acceptance(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for this test
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "User1234!";
  const testDisplayName = RandomGenerator.name();
  // 1. Member registration
  const joinConnection: api.IConnection = { host: connection.host };
  const registered = await api.functional.hrmTracker.auth.member.join(
    joinConnection,
    {
      body: {
        email: testEmail,
        password: testPassword,
        display_name: testDisplayName,
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(registered);
  // 2. Verify registration response contains expected fields
  TestValidator.equals("email matches", registered.email, testEmail);
  TestValidator.equals(
    "display_name matches",
    registered.display_name,
    testDisplayName,
  );
  TestValidator.equals("phone is null", registered.phone, null);
  TestValidator.equals("status is active", registered.status, "active");
  TestValidator.equals(
    "email_verified is false",
    registered.email_verified,
    false,
  );
  TestValidator.predicate(
    "has valid token",
    registered.token.access.length > 0,
  );
  // 3. Verify token structure
  TestValidator.equals(
    "access token exists",
    registered.token.access.length,
    registered.token.access.length,
  );
  TestValidator.equals(
    "refresh token exists",
    registered.token.refresh.length,
    registered.token.refresh.length,
  );
  TestValidator.predicate(
    "has expired_at",
    registered.token.expired_at !== null,
  );
  TestValidator.predicate(
    "has refreshable_until",
    registered.token.refreshable_until !== null,
  );
}
