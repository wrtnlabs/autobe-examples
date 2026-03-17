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
 * Test the primary success path for guest session listing without filters.
 *
 * 1. Guest creates a session using the join endpoint
 * 2. Guest queries the sessions endpoint with no filters
 * 3. Validate the response contains paginated session data with proper metadata
 */
export async function test_api_guest_session_list_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // Step 2: Query sessions without filters (empty request body)
  // All filter fields in IRequest are optional (nullable or undefined)
  const requestBody: IRedditLikeMemberSession.IRequest = {};
  // Step 3: Call the sessions endpoint
  const response: IPageIRedditLikeMemberSession.ISummary =
    await api.functional.redditLike.guest.sessions.index(guestConnection, {
      body: requestBody,
    });
  // Step 4: Validate the paginated response - typia.assert validates complete structure
  typia.assert(response);
}
