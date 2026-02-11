import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_member_create_link_and_image_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a LINK post - valid URL format
  const linkPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        type: "LINK" as const,
        url: `https://${RandomGenerator.alphaNumeric(10)}.com`,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 3. Verify LINK post
  TestValidator.equals("post type is LINK", linkPost.type, "LINK");
  TestValidator.notEquals("LINK post URL exists", linkPost.url, null);
  TestValidator.equals("LINK post content is null", linkPost.content, null);
  // 4. Create an IMAGE post - valid imageUrl format
  const imagePost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        type: "IMAGE" as const,
        imageUrl: `https://${RandomGenerator.alphaNumeric(10)}.png`,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Verify IMAGE post
  TestValidator.equals("post type is IMAGE", imagePost.type, "IMAGE");
  TestValidator.notEquals(
    "IMAGE post imageUrl exists",
    imagePost.imageUrl,
    null,
  );
  TestValidator.equals("IMAGE post content is null", imagePost.content, null);
}
