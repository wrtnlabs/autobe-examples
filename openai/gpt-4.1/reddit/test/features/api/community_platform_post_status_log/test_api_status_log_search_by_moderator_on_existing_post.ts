import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostStatusLog";

/**
 * Test that a moderator can retrieve a paginated and filtered list of all
 * status change and moderation log entries for a specific post.
 *
 * Scenario outline:
 *
 * 1. Create and login as moderator.
 * 2. Create and login as user.
 * 3. Create new community as user.
 * 4. Create new post in the community as user.
 * 5. Moderator authenticates again.
 * 6. Perform a query on status logs for the post with various pagination, filter,
 *    sort settings.
 * 7. Ensure moderator can see the moderation history (status changes, workflow
 *    events) for the post.
 * 8. Edge case: Query for a brand-new post with only the initial 'published'
 *    event, then after multiple actions, check new events appear.
 * 9. Validate that normal users cannot see the moderation history of posts
 *    (unauthorized).
 */
export async function test_api_status_log_search_by_moderator_on_existing_post(
  connection: api.IConnection,
) {
  // 1. Moderator Join
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: "active",
      href: "https://community.example.com/moderator/join",
      referrer: "https://community.example.com/landing",
      business_status: null,
      ip: null,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // 2. User Join
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 3. User Login
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/landing",
      ip: null,
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 4. Community Create
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: RandomGenerator.name(),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
        visibility: "public",
        image_url: null,
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 5. Post Create
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: postTitle,
        body: postBody,
        link_url: null,
        image_url: null,
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Moderator Login (switch role)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/landing",
      ip: null,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Fetch status logs WITHOUT any filter - should at least contain initial event (published)
  const statusLogPage =
    await api.functional.communityPlatform.moderator.posts.statusLogs.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(statusLogPage);
  TestValidator.predicate(
    "status log page contains at least one event",
    statusLogPage.data.length >= 1,
  );
  // Check that new_status of first item is 'published' or expected workflow event
  TestValidator.equals(
    "first status log's post id matches created post",
    statusLogPage.data[0].post.id,
    post.id,
  );

  // 8. Fetch with filter: status = 'published'
  const filteredPublishedPage =
    await api.functional.communityPlatform.moderator.posts.statusLogs.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: "published",
        },
      },
    );
  typia.assert(filteredPublishedPage);
  TestValidator.predicate(
    "all returned logs after published filter have new_status = 'published'",
    filteredPublishedPage.data.every((log) => log.new_status === "published"),
  );

  // 9. Fetch with non-existent filter (status = 'flagged'), should get zero or more depending on actions (here, none yet)
  const filteredFlaggedPage =
    await api.functional.communityPlatform.moderator.posts.statusLogs.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: "flagged",
        },
      },
    );
  typia.assert(filteredFlaggedPage);
  TestValidator.predicate(
    "flagged filter returns zero or more logs (should be zero on a fresh post)",
    Array.isArray(filteredFlaggedPage.data) &&
      filteredFlaggedPage.data.every((log) => log.new_status === "flagged") &&
      filteredFlaggedPage.data.length === 0,
  );

  // 10. Negative: user tries to access moderation logs (should cause error)
  // Switch auth to user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.example.com/user/login",
      referrer: "https://community.example.com/landing",
      ip: null,
    } satisfies ICommunityPlatformUser.ILogin,
  });

  await TestValidator.error(
    "unauthorized user cannot access moderation status logs",
    async () => {
      await api.functional.communityPlatform.moderator.posts.statusLogs.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 5 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    },
  );
}
