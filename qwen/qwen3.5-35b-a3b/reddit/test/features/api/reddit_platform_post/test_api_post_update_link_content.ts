import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_update_link_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Create initial link post
  // Note: community_id is assumed to exist in test environment or simulation mode
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const initialPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: "First Link Post",
        post_type: "link",
        url: "https://example.com/original",
      },
    },
  );
  typia.assert(initialPost);
  // 3. Update link post URL
  const updateResponse =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: initialPost.id,
      body: {
        url: "https://example.com/updated",
      },
    });
  typia.assert(updateResponse);
  // 4. Validate update
  TestValidator.equals(
    "URL updated",
    updateResponse.linkPost?.url,
    "https://example.com/updated",
  );
  TestValidator.equals(
    "post_type remains link",
    updateResponse.post_type,
    "link",
  );
  TestValidator.equals(
    "title unchanged",
    updateResponse.title,
    "First Link Post",
  );
  TestValidator.equals(
    "created_at matches",
    updateResponse.created_at,
    initialPost.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updateResponse.updated_at,
    initialPost.updated_at,
  );
  TestValidator.equals(
    "linkPost exists",
    updateResponse.linkPost !== null,
    true,
  );
}
