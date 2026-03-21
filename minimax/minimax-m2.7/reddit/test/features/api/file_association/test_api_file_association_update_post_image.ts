import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_file_association_update_post_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins/register - authenticate as post author
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create an image post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "image",
      },
    },
  );
  typia.assert(post);
  // 5. Upload first image file
  const firstFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: Buffer.from(
          JSON.stringify({ test: "first image data" }),
        ).toString("base64"),
        mime_type: "image/png",
        original_filename: "first_image.png",
        target_id: post.id,
        target_type: "post",
      },
    },
  );
  typia.assert(firstFile);
  // 6. Create initial file association linking image to post
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: firstFile.id,
          targetId: post.id,
          targetType: "post",
        },
      },
    );
  typia.assert(fileAssociation);
  // Validate initial association
  TestValidator.equals(
    "target type is post",
    fileAssociation.target_type,
    "post",
  );
  TestValidator.equals(
    "target id matches post",
    fileAssociation.target_id,
    post.id,
  );
  TestValidator.equals(
    "file id matches first file",
    fileAssociation.file.id,
    firstFile.id,
  );
  // 7. Upload replacement image file
  const secondFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: Buffer.from(
          JSON.stringify({ test: "second image data" }),
        ).toString("base64"),
        mime_type: "image/jpeg",
        original_filename: "second_image.jpg",
        target_id: post.id,
        target_type: "post",
      },
    },
  );
  typia.assert(secondFile);
  // 8. Update the post's image file association (replace first image with second)
  const updatedAssociation =
    await api.functional.redditClone.member.file_associations.update(
      memberConnection,
      {
        associationId: fileAssociation.id,
        body: {
          reddit_clone_file_id: secondFile.id,
        } satisfies IRedditCloneFileAssociation.IUpdate,
      },
    );
  typia.assert(updatedAssociation);
  // Validate the update
  TestValidator.equals(
    "target type still post",
    updatedAssociation.target_type,
    "post",
  );
  TestValidator.equals(
    "target id still post",
    updatedAssociation.target_id,
    post.id,
  );
  TestValidator.equals(
    "file id now matches second file",
    updatedAssociation.file.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "file id differs from first file",
    updatedAssociation.file.id,
    firstFile.id,
  );
}
