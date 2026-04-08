import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityMember";
import type { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_members_access_denied_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create unauthorized member account (user3)
  const user3Connection: api.IConnection = { host: connection.host };
  const user3Auth = await authorize_member_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(user3Auth);
  // 2. Create new connection with user3's token for API calls
  const user3ApiConnection: api.IConnection = { host: connection.host };
  user3ApiConnection.headers = {
    Authorization: `Bearer ${user3Auth.token.access}`,
  };
  // 3. Try to access community members list (user3 has no access)
  // Use a community name that user3 doesn't subscribe to
  const communityName = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  await TestValidator.error(
    "unauthorized user cannot view community members",
    async () => {
      await api.functional.redditPlatform.communities.members.index(
        user3ApiConnection,
        {
          name: communityName,
          body: {} satisfies IRedditPlatformCommunityMember.IRequest,
        },
      );
      // Should never reach here due to authorization error
      throw new Error("Expected authorization error but request succeeded");
    },
  );
}
