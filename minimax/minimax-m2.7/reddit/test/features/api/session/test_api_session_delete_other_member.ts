import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cross-member session deletion security.
 *
 * Validates that members cannot terminate other members' sessions regardless
 * of the reason. The endpoint must return 404 Not Found (not 403) to prevent
 * session enumeration attacks.
 *
 * Scenario:
 * 1. Register memberA and obtain their session
 * 2. Register memberB
 * 3. memberB attempts to delete memberA's session
 * 4. Validate response is 404 (not 403)
 */
export async function test_api_session_delete_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // Extract memberA's sessionId from the JWT access token
  const memberAJwtParts = memberA.token.access.split(".");
  const memberAJwtPayload = JSON.parse(
    atob(memberAJwtParts[1] + "==".slice((memberAJwtParts[1].length + 2) % 4)),
  );
  const memberASessionId = memberAJwtPayload.sid as string;
  // 2. Create memberB account
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. memberB attempts to delete memberA's session
  // 4. Validate response is 404 (not 403) - prevents session enumeration attacks
  await TestValidator.httpError(
    "cross-member session deletion returns 404",
    404,
    async () =>
      api.functional.redditClone.member.members.sessions.erase(
        memberBConnection,
        {
          sessionId: memberASessionId satisfies string & tags.Format<"uuid">,
        },
      ),
  );
}
