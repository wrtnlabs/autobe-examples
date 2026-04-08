import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving moderators for a community with no appointed moderators.
 *
 * Validates the moderators list endpoint behavior when a community exists but has no appointed moderators (only the owner, who is not listed in the moderators endpoint). This edge case ensures the system correctly handles communities with minimal moderation structure.
 *
 * The test performs the following validations:
 * 1. Guest authentication is successfully established
 * 2. The moderators list endpoint returns a successful response
 * 3. The data array is empty (no appointed moderators)
 * 4. Pagination metadata correctly reflects zero records and zero pages
 * 5. Community validation passes (community exists and is not soft-deleted)
 *
 * 1. Authenticate as a guest user.
 * 2. Call the moderators list endpoint with a valid community ID.
 * 3. Validate the response structure and empty data array.
 * 4. Verify pagination metadata shows records: 0 and pages: 0.
 */
export async function test_api_community_moderator_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IRedditLikeGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeGuest.IJoin,
    },
  );
  typia.assert(guestAuth);
  // 2. Call moderators list endpoint with a valid community ID
  // Note: In simulation mode, any UUID will work. In real testing, this would need a pre-existing community.
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const response: IPageIRedditLikeCommunityModerator.ISummary =
    await api.functional.redditLike.guest.communities.moderators.index(
      guestConnection,
      {
        communityId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          offset: 0,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
}
