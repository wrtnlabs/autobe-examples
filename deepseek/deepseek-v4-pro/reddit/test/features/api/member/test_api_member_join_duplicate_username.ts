import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that duplicate username registration is rejected with HTTP 409 Conflict.
 *
 * Validates the platform's username uniqueness constraint during member
 * registration. First registers a member with the username "takenuser" and a
 * randomly generated unique email address, which must succeed. Then attempts a
 * second registration with the same username "takenuser" but a different unique
 * email address to confirm the username conflict is detected independently of
 * email.
 *
 * 1. Register first member with username "takenuser" and random unique email.
 * 2. Attempt second registration with same username "takenuser" but different unique email.
 * 3. Verify second attempt is rejected with HTTP 409 Conflict.
 */
export async function test_api_member_join_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member with username "takenuser"
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: { username: "takenuser" },
  });
  typia.assert(firstMember);
  // 2. Attempt second registration with same username but different email
  await TestValidator.httpError("duplicate username", 409, async () => {
    await api.functional.communityHub.auth.member.join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: "takenuser",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityHubMember.IJoin,
      },
    );
  });
}
