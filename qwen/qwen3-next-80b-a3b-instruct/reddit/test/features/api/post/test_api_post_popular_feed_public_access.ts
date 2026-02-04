import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_popular_feed_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create an unauthenticated connection (no token)
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 3: Fetch popular feed with authenticated member connection
  const authenticatedFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.hot.index(
      memberConnection,
    );
  typia.assert(authenticatedFeed);
  // Step 4: Fetch popular feed with unauthenticated guest connection
  const guestFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.hot.index(
      guestConnection,
    );
  typia.assert(guestFeed);
  // Step 5: Validate that both responses are identical
  TestValidator.equals(
    "authenticated and guest feed responses should be identical",
    authenticatedFeed,
    guestFeed,
  );
}
