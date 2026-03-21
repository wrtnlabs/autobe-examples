import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_post_retrieval_image_post_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: "test-community",
        type: "image",
      } as IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(imagePost);
  // 3. Retrieve the image post by ID
  const retrievedPost = await api.functional.redditClone.posts.at(
    memberConnection,
    {
      postId: imagePost.id,
    },
  );
  typia.assert(retrievedPost);
  // 4. Validate image post properties
  TestValidator.equals("post title exists", !!retrievedPost.title, true);
  TestValidator.equals("post type is image", retrievedPost.type, "image");
  TestValidator.equals("has imageFileId", !!retrievedPost.imageFileId, true);
  TestValidator.equals(
    "author username exists",
    !!retrievedPost.author?.username,
    true,
  );
  TestValidator.equals(
    "community name exists",
    !!retrievedPost.community?.name,
    true,
  );
  TestValidator.equals(
    "vote_score is number",
    typeof retrievedPost.vote_score,
    "number",
  );
  TestValidator.equals(
    "comment_count is number",
    typeof retrievedPost.comment_count,
    "number",
  );
  TestValidator.equals("created_at exists", !!retrievedPost.created_at, true);
}