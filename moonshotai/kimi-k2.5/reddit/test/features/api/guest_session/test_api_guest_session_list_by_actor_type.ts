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

export async function test_api_guest_session_list_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest authentication for subsequent API calls
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Query sessions filtered by member actor type
  const response = await api.functional.redditLike.guest.sessions.index(
    guestConnection,
    {
      body: {
        actorType: "member",
        limit: 100,
      } satisfies IRedditLikeMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify filtering returned only member actor type sessions
  for (const session of response.data) {
    // Validate actorType matches the filter criteria
    TestValidator.equals("actorType is member", session.actorType, "member");
    // Validate polymorphic user field resolves to IRedditLikeMember.ISummary
    // This confirms the discriminator-based type resolution works correctly
    typia.assert<IRedditLikeMember.ISummary>(session.user);
  }
  // 4. Verify pagination metadata consistency
  TestValidator.equals(
    "records count matches data length",
    response.pagination.records,
    response.data.length,
  );
}
