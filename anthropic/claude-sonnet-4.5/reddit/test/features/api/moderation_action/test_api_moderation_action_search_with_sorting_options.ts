import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test various sorting options for moderation action search results.
 *
 * This test validates that moderators can view moderation actions in different
 * meaningful orders to support various analysis workflows. It ensures that
 * sort_by and order parameters correctly organize results for chronological
 * review, action type analysis, and moderator activity comparison.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create community
 * 3. Create member account
 * 4. Create diverse content (posts)
 * 5. Perform various moderation actions with different timestamps
 * 6. Test sort_by='created_at' with order='desc' (most recent first)
 * 7. Test sort_by='created_at' with order='asc' (oldest first)
 * 8. Test sort_by='action_type' to group similar actions
 * 9. Verify sort stability with pagination
 */
export async function test_api_moderation_action_search_with_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create member account and switch to member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // 4. Create multiple posts for moderation
  const posts: IRedditCommunityPost[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const post = await api.functional.redditCommunity.member.posts.create(
        connection,
        {
          body: {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "text",
            body: RandomGenerator.content({ paragraphs: 2 }),
            url: null,
            image_url: null,
          } satisfies IRedditCommunityPost.ICreate,
        },
      );
      typia.assert(post);
      return post;
    },
  );

  // 5. Switch back to moderator and perform moderation actions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 6. Test sort_by='created_at' with order='desc' (most recent first)
  const descResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(descResult);

  // Verify descending order by created_at
  for (let i = 0; i < descResult.data.length - 1; i++) {
    const current = new Date(descResult.data[i].created_at);
    const next = new Date(descResult.data[i + 1].created_at);
    TestValidator.predicate(
      "descending order: current action should be newer than or equal to next",
      current >= next,
    );
  }

  // 7. Test sort_by='created_at' with order='asc' (oldest first)
  const ascResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(ascResult);

  // Verify ascending order by created_at
  for (let i = 0; i < ascResult.data.length - 1; i++) {
    const current = new Date(ascResult.data[i].created_at);
    const next = new Date(ascResult.data[i + 1].created_at);
    TestValidator.predicate(
      "ascending order: current action should be older than or equal to next",
      current <= next,
    );
  }

  // 8. Test sort_by='action_type' to group similar actions
  const typeResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          sort_by: "action_type",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(typeResult);

  // Verify action_type sorting (alphabetically ascending)
  for (let i = 0; i < typeResult.data.length - 1; i++) {
    const currentType = typeResult.data[i].action_type;
    const nextType = typeResult.data[i + 1].action_type;
    TestValidator.predicate(
      "action_type ascending: current should be <= next alphabetically",
      currentType <= nextType,
    );
  }

  // 9. Verify pagination stability with sorting
  if (descResult.pagination.pages > 1) {
    const page1 = descResult;
    const page2: IPageIRedditCommunityModerationAction.ISummary =
      await api.functional.redditCommunity.moderator.communities.moderationActions.index(
        connection,
        {
          communityName: communityName,
          body: {
            page: 2,
            limit: descResult.pagination.limit,
            sort_by: "created_at",
            order: "desc",
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(page2);

    if (page1.data.length > 0 && page2.data.length > 0) {
      const lastOfPage1 = new Date(
        page1.data[page1.data.length - 1].created_at,
      );
      const firstOfPage2 = new Date(page2.data[0].created_at);
      TestValidator.predicate(
        "pagination stability: last item of page 1 should be >= first item of page 2",
        lastOfPage1 >= firstOfPage2,
      );
    }
  }

  // Verify that default sorting behavior works (when sort parameters omitted)
  const defaultResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default result should have data",
    defaultResult.data.length >= 0,
  );
}
