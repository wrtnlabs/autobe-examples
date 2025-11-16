import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvent";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvent";

/**
 * Validate that adminUser karmaEvents search supports filtering by event_type
 * for a specific member user.
 *
 * Business flow:
 *
 * 1. Create two member users A (post author) and B (voter).
 * 2. Create an adminUser to query karma events.
 * 3. As member A, create a community and join it.
 * 4. As member A, create a post in that community.
 * 5. As member B, join the same community and cast at least one vote on the post
 *    to generate karma events for member A.
 * 6. As adminUser, first query karma events for member A without event_type filter
 *    and derive an actual event_type value from the response.
 * 7. Then query again with event_type filter set to the derived value and assert
 *    that all returned events belong to member A and have that event_type, and
 *    that the filtered result set is not larger than the unfiltered one.
 */
export async function test_api_admin_karma_events_filter_by_event_type(
  connection: api.IConnection,
) {
  // Common URLs for member sessions
  const memberJoinHref: string = "https://client.example.com/join";
  const memberJoinReferrer: string = "https://client.example.com/landing";

  // 1. Register member user A (author)
  const memberAJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA = await api.functional.auth.memberUser.join(connection, {
    body: memberAJoinInput,
  });
  typia.assert(memberA);

  // 1-2. Register member user B (voter)
  const memberBJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB = await api.functional.auth.memberUser.join(connection, {
    body: memberBJoinInput,
  });
  typia.assert(memberB);

  // 2. Register an admin user
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoin);

  // 3. As member A, login and create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberA.email,
      password: memberAJoinInput.password,
      ip: null,
      href: memberJoinHref,
      referrer: memberJoinReferrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const communityCreateInput = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  // Member A joins the community (membership row)
  const membershipAInput = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipAInput,
      },
    );
  typia.assert(membershipA);

  // 4. As member A, create a post in the community
  const postCreateInput = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateInput,
    },
  );
  typia.assert(post);

  // 5. As member B, login, join community, and vote on the post
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberB.email,
      password: memberBJoinInput.password,
      ip: null,
      href: memberJoinHref,
      referrer: memberJoinReferrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const membershipBInput = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBInput,
      },
    );
  typia.assert(membershipB);

  // Cast an upvote on the post to generate at least one karma event
  const upvoteInput = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const upvote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: upvoteInput,
      },
    );
  typia.assert(upvote);

  // Optionally change the vote direction to increase the chance of
  // multiple event types, but the filter test will not depend on
  // specific literal event_type values.
  const downvoteInput = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const downvote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: downvoteInput,
      },
    );
  typia.assert(downvote);

  // 6. As adminUser, login to query karma events
  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: adminJoinInput.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  // First, query karma events for member A without event_type filter
  const unfilteredRequestBody = {
    memberuser_id: memberA.id,
    post_id: post.id,
    comment_id: undefined,
    event_type: undefined,
    min_created_at: null,
    max_created_at: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_direction: "desc",
  } satisfies ICommunityPlatformKarmaEvent.IRequest;

  const unfilteredPage =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: unfilteredRequestBody,
      },
    );
  typia.assert(unfilteredPage);

  // Ensure we have at least one event for the member and post
  TestValidator.predicate(
    "unfiltered karma events for member A must not be empty after votes",
    unfilteredPage.data.length > 0,
  );

  // Derive a real event_type value from the first returned event
  const firstEvent = unfilteredPage.data[0];
  typia.assert<ICommunityPlatformKarmaEvent.ISummary>(firstEvent);
  const targetEventType: string = firstEvent.event_type;

  // 7. Query again with event_type filter using the derived type
  const filteredRequestBody = {
    memberuser_id: memberA.id,
    post_id: post.id,
    comment_id: undefined,
    event_type: targetEventType,
    min_created_at: null,
    max_created_at: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_direction: "desc",
  } satisfies ICommunityPlatformKarmaEvent.IRequest;

  const filteredPage =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredPage);

  // Filtered page must also contain at least one event (the one we sampled)
  TestValidator.predicate(
    "filtered karma events by derived event_type must not be empty",
    filteredPage.data.length > 0,
  );

  // All events in filtered results must belong to member A and have the
  // requested event_type.
  for (const event of filteredPage.data) {
    typia.assert<ICommunityPlatformKarmaEvent.ISummary>(event);

    TestValidator.equals(
      "karma event member should match member A",
      event.memberuser.id,
      memberA.id,
    );

    TestValidator.equals(
      "karma event_type should match filtered event_type",
      event.event_type,
      targetEventType,
    );
  }

  // And the filtered result set cannot be larger than the unfiltered one.
  TestValidator.predicate(
    "filtered result count must be less than or equal to unfiltered result count",
    filteredPage.data.length <= unfilteredPage.data.length,
  );
}
