import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_detail_content_type_resolution(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const postIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const posts: ICommunityPlatformPost[] = [];
  for (const postId of postIds) {
    const post = await api.functional.communityPlatform.member.posts.at(
      memberConnection,
      {
        postId,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  TestValidator.notEquals(
    "first and second post should be different records",
    posts[0].id,
    posts[1].id,
  );
  TestValidator.notEquals(
    "second and third post should be different records",
    posts[1].id,
    posts[2].id,
  );
  TestValidator.notEquals(
    "first and third post should be different records",
    posts[0].id,
    posts[2].id,
  );
  for (const post of posts) {
    TestValidator.predicate(
      "post title should not be empty",
      post.title.length > 0,
    );
    TestValidator.predicate(
      "post status should not be empty",
      post.status.length > 0,
    );
    TestValidator.predicate("post id should be a string", post.id.length > 0);
    TestValidator.predicate(
      "post created_at should be present",
      post.created_at.length > 0,
    );
    TestValidator.predicate(
      "post updated_at should be present",
      post.updated_at.length > 0,
    );
    TestValidator.predicate(
      "post author should be present",
      post.author !== null && post.author !== undefined,
    );
    TestValidator.predicate(
      "post community should be present",
      post.community !== null && post.community !== undefined,
    );
  }
  TestValidator.equals(
    "first post should have a stable response shape",
    Object.keys(posts[0]).sort(),
    ["author", " համայնty"] as never,
  );
}
