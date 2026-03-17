import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
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

export async function test_api_file_thumbnail_with_soft_deleted_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: authResult.token.access };
  // 2. Upload image file
  const file = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "post",
        owner_id: typia.random<string & tags.Format<"uuid">>() satisfies string,
        file_uri: typia.random<string & tags.Format<"uri">>() satisfies string,
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Create post with image file
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string,
        post_type: "image",
        fileId: file.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Get thumbnails list for the file
  const thumbnailsList =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId: file.id,
        body: {},
      },
    );
  typia.assert(thumbnailsList);
  // 5. Verify at least one thumbnail exists
  TestValidator.predicate(
    "thumbnails list not empty",
    thumbnailsList.data.length > 0,
  );
  const thumbnail = thumbnailsList.data[0];
  typia.assert(thumbnail);
  // 6. Retrieve thumbnail before post deletion - should succeed
  const thumbnailBeforeDeletion =
    await api.functional.redditCommunity.files.thumbnails.at(memberConnection, {
      fileId: file.id,
      thumbnailId: thumbnail.id,
    });
  typia.assert(thumbnailBeforeDeletion);
  TestValidator.equals(
    "thumbnail retrieved successfully before deletion",
    thumbnailBeforeDeletion.id,
    thumbnail.id,
  );
  // 7. Delete post (triggers soft delete of parent file)
  await api.functional.redditCommunity.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 8. Attempt to retrieve thumbnail after post deletion - should fail with 404
  await TestValidator.error(
    "thumbnail inaccessible after parent file soft-deleted",
    async () => {
      await api.functional.redditCommunity.files.thumbnails.at(
        memberConnection,
        {
          fileId: file.id,
          thumbnailId: thumbnail.id,
        },
      );
    },
  );
}
