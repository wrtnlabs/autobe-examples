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

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(joined);
  // 2. Authenticate member to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_member_login(loginConnection, {
    body: {
      email: joined.email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IHrmTrackerMember.ILogin,
  });
  typia.assert(logged);
  const originalUpdatedAt = logged.updated_at;
  // 3. Update member's global profile
  const display_name = RandomGenerator.name();
  const avatar_url = null;
  const phone = RandomGenerator.mobile();
  const updated = await api.functional.hrmTracker.member.profile.updateProfile(
    loginConnection,
    {
      body: {
        display_name,
        avatar_url,
        phone,
      } satisfies IHrmTrackerMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate updated profile
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    display_name,
  );
  TestValidator.equals("avatar_url updated", updated.avatar_url, avatar_url);
  TestValidator.equals("phone updated", updated.phone, phone);
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    originalUpdatedAt,
  );
  // 5. Verify global profile consistency
  TestValidator.predicate("email verified", updated.email_verified === true);
  TestValidator.equals("status is active", updated.status, "active");
  TestValidator.equals("email matches original", updated.email, joined.email);
}
