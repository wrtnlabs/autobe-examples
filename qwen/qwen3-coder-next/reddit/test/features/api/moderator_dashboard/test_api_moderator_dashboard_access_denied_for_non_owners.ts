import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_moderator_dashboard_access_denied_for_non_owners(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(ownerUser);
  ownerConnection.headers = {
    ...ownerConnection.headers,
    Authorization: ownerUser.token.access,
  };
  // Step 2: Register and login as regular member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(memberUser);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberUser.token.access,
  };
  // Step 3: Verify owner can access dashboard (should succeed)
  const ownerDashboard =
    await api.functional.redditClone.owner.analytics.moderator.dashboard.analytics(
      ownerConnection,
    );
  typia.assert(ownerDashboard);
  // Step 4: Verify member cannot access dashboard (should fail with 403)
  try {
    await api.functional.redditClone.owner.analytics.moderator.dashboard.analytics(
      memberConnection,
    );
    throw new Error("Expected 403 Forbidden error but request succeeded");
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) {
      throw error;
    }
    TestValidator.equals(
      "HTTP status should be 403 Forbidden",
      error.status,
      403,
    );
    TestValidator.predicate(
      "error should contain message",
      () => typeof error.message === "string" && error.message.length > 0,
    );
  }
}
