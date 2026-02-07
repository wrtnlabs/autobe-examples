import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_creation_link_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account using authorize utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies ICommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // 2. Create a post with valid link content
  // The ICommunityPost.ICreate requires title and content_type, and url for link posts
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_type: "link" as const,
    url: "https://example.com/interesting-article" satisfies string &
      tags.Format<"url">,
  } satisfies ICommunityPost.ICreate;
  // 3. Create the post using the generate utility function (has priority over SDK)
  const createdPost = await generate_random_community_member_posts_create(
    memberConnection,
    { body: postData },
  );
  typia.assert(createdPost);
}
