import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Validate admin permission to retrieve the archives of a deleted post,
 * including all snapshot audit data and pagination/sorting controls.
 *
 * 1. Register an admin user and login as admin (to enable admin post archive
 *    operations).
 * 2. Register a regular user and login as user.
 * 3. User creates a community.
 * 4. User creates a post within this community.
 * 5. User deletes the post, which creates one or more archive events.
 * 6. Switch to admin (re-authenticate as admin if required).
 * 7. Use the admin archive endpoint to fetch paginated list of archived snapshots
 *    for the deleted post.
 * 8. Assert that the returned archive page includes the deleted post's details
 *    (committed at deletion), as well as full metadata (archived_at,
 *    archived_by_user, etc).
 * 9. Exercise pagination and sorting/filtering props.
 */
export async function test_api_post_archives_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://admin.reg.example.com/",
    referrer: "https://main.nav.example.com/",
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 2: User registration
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    href: "https://userplatform.example.com/join",
    referrer: "https://community.example.com/register",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  // Step 3: Switch session to user context for community and post creation
  // (Already authenticated as user after join)

  // Step 4: User creates a community
  const commCreateBody = {
    name: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: commCreateBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    commCreateBody.name,
  );

  // Step 5: User creates a post in the community (as a text post)
  const postCreateBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post title matches input",
    post.title,
    postCreateBody.title,
  );
  TestValidator.predicate(
    "post text_content present",
    post.text_content !== null && post.text_content !== undefined,
  );

  // Step 6: User deletes their post to generate archive snapshot(s)
  await api.functional.communityPlatform.user.posts.erase(connection, {
    postId: post.id,
  });

  // Step 7: Switch back to admin context (reenable admin JWT)
  await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });

  // Step 8: Admin fetches the archive list for the deleted post (covers paging, sorting)
  // -- Simple first page fetch --
  const basicArchiveReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    // Optionally exercise search/sort
  } satisfies ICommunityPlatformPostArchive.IRequest;
  const archivePage =
    await api.functional.communityPlatform.admin.posts.archives.index(
      connection,
      {
        postId: post.id,
        body: basicArchiveReq,
      },
    );
  typia.assert(archivePage);
  TestValidator.equals(
    "archive data returned for deleted post",
    archivePage.data.length > 0,
    true,
  );
  // Each archive should reference the original post id and match audit info
  const snapshot = archivePage.data.find(
    (a) => a.community_platform_post_id === post.id,
  );
  TestValidator.predicate("expected snapshot for deleted post", !!snapshot);
  if (snapshot) {
    TestValidator.equals(
      "archived title matches post",
      snapshot.archived_title,
      post.title,
    );
    TestValidator.equals(
      "archived_by_user id matches deleter",
      snapshot.archived_by_user_id,
      user.id,
    );
    TestValidator.predicate(
      "archived_at exists",
      typeof snapshot.archived_at === "string" &&
        snapshot.archived_at.length > 0,
    );
  }

  // Step 9: Fetch with search, sort options
  const searchKeyword = post.title.split(" ")[0] ?? post.title.substring(0, 5);
  const searchSortReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: searchKeyword,
    sort_by: RandomGenerator.pick(["archived_at", "archived_title"] as const),
    sort_direction: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies ICommunityPlatformPostArchive.IRequest;
  const filteredPage =
    await api.functional.communityPlatform.admin.posts.archives.index(
      connection,
      {
        postId: post.id,
        body: searchSortReq,
      },
    );
  typia.assert(filteredPage);
  // Confirm pagination and any filtered results
  TestValidator.equals(
    "pagination info included",
    typeof filteredPage.pagination,
    "object",
  );
}
