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

export async function test_api_file_upload_post_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a text post to attach image to
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = { Authorization: memberAuth.token.access };
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: randomCommunityId,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  typia.assert(post.content);
  // 3. Upload image file for the post
  const fileConnection: api.IConnection = { host: connection.host };
  fileConnection.headers = { Authorization: memberAuth.token.access };
  const imageFile = await api.functional.redditCommunity.member.files.create(
    fileConnection,
    {
      body: {
        file_type: "post",
        owner_id: post.id,
        file_uri: "https://example.com/sample-image.jpg",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(imageFile);
  // 4. Validate file response structure
  TestValidator.equals(
    "file type is post_image",
    imageFile.fileType,
    "post_image",
  );
  TestValidator.notEquals(
    "file ID is different from post ID",
    imageFile.id,
    post.id,
  );
  TestValidator.notEquals(
    "mimeType is valid image type",
    imageFile.mimeType,
    "",
  );
  TestValidator.notEquals("fileName is set", imageFile.fileName, "");
  TestValidator.notEquals("filePath is set", imageFile.filePath, "");
  TestValidator.notEquals("thumbnail exists", imageFile.thumbnail, null);
  if (imageFile.thumbnail) {
    TestValidator.notEquals(
      "thumbnail URL is set",
      imageFile.thumbnail.thumbnail_url,
      "",
    );
    TestValidator.predicate(
      "thumbnail has valid dimensions",
      imageFile.thumbnail.width > 0 && imageFile.thumbnail.height > 0,
    );
    TestValidator.notEquals(
      "thumbnail format is valid",
      imageFile.thumbnail.format,
      "",
    );
  }
}
