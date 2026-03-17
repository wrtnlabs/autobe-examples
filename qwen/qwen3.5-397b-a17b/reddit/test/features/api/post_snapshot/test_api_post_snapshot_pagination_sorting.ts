import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test pagination and sorting functionality for post snapshot retrieval.
 *
 * This test verifies:
 * 1. Member authentication and resource creation
 * 2. Post modification creates snapshots (10+ modifications)
 * 3. Default pagination returns reverse chronological order
 * 4. Custom pagination parameters (page, limit) work correctly
 * 5. Sorting direction (asc/desc) affects result order
 * 6. Pagination metadata is accurate
 * 7. No duplicate or missing snapshots across pages
 */
export async function test_api_post_snapshot_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community for the post
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.assert<string & tags.MaxLength<80000>>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create initial post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Modify post 10+ times to create sufficient snapshots for pagination testing
  const modificationCount = 12;
  const modificationTitles: string[] = [];
  for (let i = 0; i < modificationCount; i++) {
    const updatedTitle = `Modified Title ${i + 1} - ${RandomGenerator.alphabets(8)}`;
    modificationTitles.push(updatedTitle);
    const updatedPost = await api.functional.redditClone.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: updatedTitle,
          text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditClonePost.IUpdate,
      },
    );
    typia.assert(updatedPost);
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 5. Test default pagination (should be reverse chronological - newest first)
  const defaultResponse =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify we have snapshots (initial + 12 modifications = 13 snapshots)
  TestValidator.predicate(
    "default response has snapshots",
    defaultResponse.data.length >= modificationCount,
  );
  // Verify default sorting is reverse chronological (newest first)
  if (defaultResponse.data.length >= 2) {
    const firstSnapshot = defaultResponse.data[0];
    const secondSnapshot = defaultResponse.data[1];
    TestValidator.predicate(
      "default sort is reverse chronological",
      new Date(firstSnapshot.created_at).getTime() >=
        new Date(secondSnapshot.created_at).getTime(),
    );
  }
  // 6. Test with page=1, limit=5 (first page)
  const page1Response =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify page 1 has correct limit
  TestValidator.equals(
    "page 1 data length",
    page1Response.data.length,
    Math.min(5, defaultResponse.data.length),
  );
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  // 7. Test with page=2, limit=5 (second page)
  const page2Response =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify page 2 data
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // 8. Verify pagination metadata is correct
  const totalPages = Math.ceil(defaultResponse.data.length / 5);
  TestValidator.equals(
    "page 1 total pages",
    page1Response.pagination.pages,
    totalPages,
  );
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    defaultResponse.data.length,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Response.pagination.pages,
    totalPages,
  );
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    defaultResponse.data.length,
  );
  // 9. Verify no duplicate snapshots between pages
  const page1Ids = page1Response.data.map((s) => s.id);
  const page2Ids = page2Response.data.map((s) => s.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicate snapshots between pages",
    duplicates.length,
    0,
  );
  // 10. Test with direction=asc (chronological - oldest first)
  const ascResponse =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: "asc",
          limit: 10,
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(ascResponse);
  // Verify ascending order (oldest first)
  if (ascResponse.data.length >= 2) {
    const firstAsc = ascResponse.data[0];
    const secondAsc = ascResponse.data[1];
    TestValidator.predicate(
      "asc direction is chronological",
      new Date(firstAsc.created_at).getTime() <=
        new Date(secondAsc.created_at).getTime(),
    );
  }
  // 11. Test with direction=desc (reverse chronological - newest first)
  const descResponse =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: "desc",
          limit: 10,
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(descResponse);
  // Verify descending order (newest first)
  if (descResponse.data.length >= 2) {
    const firstDesc = descResponse.data[0];
    const secondDesc = descResponse.data[1];
    TestValidator.predicate(
      "desc direction is reverse chronological",
      new Date(firstDesc.created_at).getTime() >=
        new Date(secondDesc.created_at).getTime(),
    );
  }
  // 12. Validate snapshot data consistency - verify all snapshots have required fields
  for (const snapshot of defaultResponse.data) {
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
    TestValidator.predicate(
      "snapshot has post_type",
      ["TEXT", "LINK", "IMAGE"].includes(snapshot.post_type),
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      !isNaN(new Date(snapshot.created_at).getTime()),
    );
    TestValidator.predicate(
      "snapshot has author",
      snapshot.author !== undefined && snapshot.author.id !== undefined,
    );
  }
  // 13. Verify total snapshot count matches modifications + initial creation
  TestValidator.predicate(
    "total snapshots matches expected count",
    defaultResponse.pagination.records >= modificationCount,
  );
}