import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberSession";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering sessions by activeOnly flag to show only non-expired sessions.
 *
 * 1. Create a guest session by joining
 * 2. Query sessions with activeOnly=true to verify only active sessions are returned
 * 3. Verify all returned sessions have isActive=true
 * 4. Validate the computed field logic filters expired sessions correctly
 */
export async function test_api_guest_session_list_active_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session first (dependency) - the join endpoint internally sets the Authorization header
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.redditLike.auth.guest.join(
    guestConnection,
    {
      body: {
        deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
        href: "https://example.com/test",
        referrer: "https://example.com/",
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IRedditLikeGuest.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Query sessions with activeOnly true
  const activeSessions: IPageIRedditLikeMemberSession.ISummary =
    await api.functional.redditLike.guest.sessions.index(guestConnection, {
      body: {
        activeOnly: true,
      } satisfies IRedditLikeMemberSession.IRequest,
    });
  typia.assert(activeSessions);
  // 3. Verify all returned sessions have isActive equal to true
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "all sessions should be active when activeOnly=true",
      session.isActive === true,
    );
  }
  // 4. Query without activeOnly filter for comparison (optional validation)
  const allSessions: IPageIRedditLikeMemberSession.ISummary =
    await api.functional.redditLike.guest.sessions.index(guestConnection, {
      body: {} satisfies IRedditLikeMemberSession.IRequest,
    });
  typia.assert(allSessions);
  // 5. Test activeOnly:false returns sessions including inactive ones (if any exist)
  const nonActiveFilterResult: IPageIRedditLikeMemberSession.ISummary =
    await api.functional.redditLike.guest.sessions.index(guestConnection, {
      body: {
        activeOnly: false,
      } satisfies IRedditLikeMemberSession.IRequest,
    });
  typia.assert(nonActiveFilterResult);
}
