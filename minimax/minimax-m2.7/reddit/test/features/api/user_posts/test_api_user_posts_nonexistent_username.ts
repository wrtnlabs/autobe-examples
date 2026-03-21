import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_user_posts_nonexistent_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session
  const guestAuth = await authorize_guest_join(connection, {});
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 2. Call the endpoint with a non-existent username
  const nonexistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(10)}`;
  const response = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: nonexistentUsername,
      body: {} satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate empty result set
  TestValidator.equals("data array should be empty", response.data, []);
  // 4. Validate pagination metadata shows zero records
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
}
