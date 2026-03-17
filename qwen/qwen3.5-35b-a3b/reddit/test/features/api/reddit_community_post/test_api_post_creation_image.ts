import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_creation_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Upload an image file for the image post
  const uploadedFile = await api.functional.redditCommunity.member.files.create(
    memberConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: "https://example.com/test-image.png",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(uploadedFile);
  // 3. Create an image post with the uploaded file
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: title,
        community_id: communityId,
        post_type: "image" as const,
        fileId: uploadedFile.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 4. Validate post creation
  TestValidator.equals(
    "initial vote score should be 0",
    imagePost.vote_score,
    0,
  );
  TestValidator.equals(
    "initial comment count should be 0",
    imagePost.comment_count,
    0,
  );
  TestValidator.equals(
    "post type should be image",
    imagePost.post_type,
    "image",
  );
  TestValidator.equals("post title should match input", imagePost.title, title);
  TestValidator.equals(
    "post community should match request",
    imagePost.community.id,
    communityId,
  );
  TestValidator.equals(
    "content should be image type",
    imagePost.content.post_type,
    "image",
  );
  TestValidator.equals(
    "fileUri should be set",
    typia.assert<{ post_type: "image"; fileUri: string }>(imagePost.content).fileUri !== undefined ? "set" : "missing",
    "set",
  );
  TestValidator.equals(
    "created_at timestamp should be present",
    imagePost.created_at !== undefined ? "present" : "missing",
    "present",
  );
  TestValidator.equals(
    "deleted_at should be null for active post",
    imagePost.deleted_at,
    null,
  );
}