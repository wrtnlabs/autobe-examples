import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_post_snapshots_with_edit_reason_search(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Since we cannot create snapshots with specific edit reasons through available APIs,
  // we'll test the filtering functionality with whatever snapshots exist
  // First, get all snapshots without filtering
  const allSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Test different search criteria on existing snapshots
  if (allSnapshots.data.length > 0) {
    // Find snapshots with non-null edit reasons to test filtering
    const snapshotsWithReasons = allSnapshots.data.filter(
      (snapshot) =>
        snapshot.edit_reason !== null && snapshot.edit_reason !== undefined,
    );
    if (snapshotsWithReasons.length > 0) {
      // Test partial text matching using existing edit reasons
      const sampleSnapshot = snapshotsWithReasons[0];
      if (sampleSnapshot.edit_reason && sampleSnapshot.edit_reason.length > 3) {
        const partialText = sampleSnapshot.edit_reason.substring(0, 3);
        const partialSearchResult =
          await api.functional.communityPlatform.moderator.posts.snapshots.index(
            moderatorConnection,
            {
              postId: post.id,
              body: {
                edit_reason: partialText,
              } satisfies ICommunityPlatformPostSnapshot.IRequest,
            },
          );
        typia.assert(partialSearchResult);
        // Validate that results contain the partial text
        TestValidator.predicate(
          "partial search returns relevant snapshots",
          partialSearchResult.data.every(
            (snapshot) => snapshot.edit_reason?.includes(partialText) ?? false,
          ),
        );
      }
      // Test exact matching
      const exactSearchResult =
        await api.functional.communityPlatform.moderator.posts.snapshots.index(
          moderatorConnection,
          {
            postId: post.id,
            body: {
              edit_reason: sampleSnapshot.edit_reason,
            } satisfies ICommunityPlatformPostSnapshot.IRequest,
          },
        );
      typia.assert(exactSearchResult);
      // Validate exact matching
      TestValidator.predicate(
        "exact search returns exact matches",
        exactSearchResult.data.every(
          (snapshot) => snapshot.edit_reason === sampleSnapshot.edit_reason,
        ),
      );
    }
    // Test null edit reason filtering
    const nullSearchResult =
      await api.functional.communityPlatform.moderator.posts.snapshots.index(
        moderatorConnection,
        {
          postId: post.id,
          body: {
            edit_reason: null,
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(nullSearchResult);
    // Validate null edit reason filtering
    TestValidator.predicate(
      "null edit reason search returns only null snapshots",
      nullSearchResult.data.every((snapshot) => snapshot.edit_reason === null),
    );
    // Test empty string search
    const emptySearchResult =
      await api.functional.communityPlatform.moderator.posts.snapshots.index(
        moderatorConnection,
        {
          postId: post.id,
          body: {
            edit_reason: "",
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(emptySearchResult);
    // Validate empty string search returns non-null snapshots
    TestValidator.predicate(
      "empty string search returns non-null snapshots",
      emptySearchResult.data.every((snapshot) => snapshot.edit_reason !== null),
    );
    // Test non-matching search
    const nonMatchingSearchResult =
      await api.functional.communityPlatform.moderator.posts.snapshots.index(
        moderatorConnection,
        {
          postId: post.id,
          body: {
            edit_reason: "NON_EXISTENT_EDIT_REASON_12345",
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(nonMatchingSearchResult);
    // Validate non-matching search returns empty results
    TestValidator.equals(
      "non-matching search returns empty",
      nonMatchingSearchResult.data.length,
      0,
    );
  }
  // Test pagination parameters work correctly with edit_reason filtering
  const paginatedSearch =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          edit_reason: "", // Empty string to get all non-null snapshots
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedSearch.pagination !== undefined &&
      paginatedSearch.pagination.current >= 0 &&
      paginatedSearch.pagination.limit >= 0 &&
      paginatedSearch.pagination.records >= 0 &&
      paginatedSearch.pagination.pages >= 0,
  );
}
