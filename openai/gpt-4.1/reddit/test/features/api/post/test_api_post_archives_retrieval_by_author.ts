import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostArchive";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostArchive";

/**
 * Validate that a post author can retrieve the full archive history of their
 * own post. This test executes the following workflow:
 *
 * 1. Register user
 * 2. Create a community as this user
 * 3. Create a text post in that community
 * 4. Delete the post (triggers archive/snapshot creation)
 * 5. Retrieve post archive history via the patch API as the author
 * 6. Validate response structure, archive snapshot realism, and result ordering
 *
 * Checks:
 *
 * - All returned archives are for the deleted post (not current version)
 * - Archives are paginated and ordered by archived_at descending (default)
 * - Each snapshot accurately reflects archived state and actor
 * - Metadata and archive actor/user reference are correct
 */
export async function test_api_post_archives_retrieval_by_author(
  connection: api.IConnection,
) {
  // 1. Register user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://community-platform.test/register",
    referrer: "https://community-platform.test/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // 2. Create a community as this user
  const communityCreateBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Create a text post in that community
  const postCreateBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Delete the post
  await api.functional.communityPlatform.user.posts.erase(connection, {
    postId: post.id,
  });

  // 5. Retrieve archived snapshots via author as patch
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformPostArchive.IRequest;
  const archivesPage: IPageICommunityPlatformPostArchive =
    await api.functional.communityPlatform.user.posts.archives.index(
      connection,
      {
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(archivesPage);

  // 6. Validate that at least one archive exists for the deleted post
  TestValidator.predicate(
    "At least one archived snapshot exists after post deletion",
    archivesPage.data.length >= 1,
  );

  // All archives are for the same post and by the correct archiving actor (the author)
  archivesPage.data.forEach((archive: ICommunityPlatformPostArchive) => {
    TestValidator.equals(
      "Archived post id matches deleted post id",
      archive.community_platform_post_id,
      post.id,
    );
    TestValidator.equals(
      "Archived by user matches test user",
      archive.archived_by_user_id,
      user.id,
    );
    TestValidator.equals(
      "archived_by_user summary id",
      archive.archived_by_user.id,
      user.id,
    );
    TestValidator.equals(
      "archived_by_user summary display_name",
      archive.archived_by_user.display_name,
      user.display_name,
    );
    TestValidator.equals(
      "archive title matches post title",
      archive.archived_title,
      post.title,
    );
    if (post.text_content) {
      TestValidator.equals(
        "archive text content matches post text",
        archive.archived_body,
        post.text_content.body,
      );
    }
    TestValidator.equals(
      "archived_at is ISO datetime",
      typeof archive.archived_at,
      "string",
    );
  });

  // Confirm archives are ordered descending by archived_at (default)
  for (let i = 1; i < archivesPage.data.length; ++i) {
    TestValidator.predicate(
      `archives[${i - 1}] should not be earlier than archives[${i}]`,
      archivesPage.data[i - 1].archived_at >= archivesPage.data[i].archived_at,
    );
  }
}
