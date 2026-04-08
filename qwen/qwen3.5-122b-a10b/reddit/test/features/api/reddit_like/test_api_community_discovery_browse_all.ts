import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_discovery_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Browse all communities with empty search (no filter)
  const browseResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: "",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(browseResult);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    browseResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    browseResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    browseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    browseResult.pagination.pages >= 0,
  );
  // 4. Validate community data structure when results exist
  if (browseResult.data.length > 0) {
    const firstCommunity = browseResult.data[0];
    typia.assert(firstCommunity);
    // Validate subscriber_count is a valid number (business logic check)
    TestValidator.predicate(
      "subscriber count is non-negative",
      firstCommunity.subscriber_count >= 0,
    );
  }
  // 5. Test with specific limit and offset
  const offsetResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: undefined,
          offset: 0,
          limit: 10,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(offsetResult);
  // 6. Validate pagination consistency
  TestValidator.equals("current page is 1", offsetResult.pagination.current, 1);
  TestValidator.equals("limit is 10", offsetResult.pagination.limit, 10);
}
