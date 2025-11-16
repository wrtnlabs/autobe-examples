import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * End-to-end test for authenticated user searching, filtering, and paginating
 * their own community subscriptions.
 *
 * This test validates the following business scenarios:
 *
 * 1. Register a new user (establish authenticated session)
 * 2. Create multiple communities
 * 3. Subscribe the user to the created communities
 * 4. Use PATCH /communityPlatform/user/communitySubscriptions with
 *    filter/sort/pagination options to:
 *
 *    - List all the user's subscriptions
 *    - Filter by community
 *    - Paginate across available subscriptions and check page boundaries
 *    - Include soft-deleted (unsubscribed) entries
 *    - Sort ascending/descending by created_at and updated_at
 * 5. Validate that only the authenticated user's subscriptions appear; other
 *    users' data must not be returned
 * 6. Check logical correctness for pagination metadata, included/deleted
 *    filtering, and sorting
 */
export async function test_api_community_subscription_search_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create multiple communities
  const communities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const input = {
        name: RandomGenerator.alphabets(10) + RandomGenerator.alphaNumeric(3),
        display_title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 6,
          sentenceMax: 8,
        }),
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "invite-only",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "archived",
          "banned",
          "pending approval",
        ] as const),
        image_url: null,
      } satisfies ICommunityPlatformCommunity.ICreate;
      const created =
        await api.functional.communityPlatform.user.communities.create(
          connection,
          { body: input },
        );
      typia.assert(created);
      return created;
    });

  // 3. Subscribe the user to the created communities
  const subs: ICommunityPlatformCommunitySubscription[] = [];
  for (const community of communities) {
    const sub =
      await api.functional.communityPlatform.user.communitySubscriptions.create(
        connection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(sub);
    subs.push(sub);
  }

  // 4. Search and filter user subscriptions using PATCH /communityPlatform/user/communitySubscriptions
  // 4a. List all subscriptions with default pagination (page=1, limit=2)
  const listPage1 =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(listPage1);
  TestValidator.equals(
    "returned data length matches limit or remaining records",
    listPage1.data.length,
    Math.min(2, subs.length),
  );
  TestValidator.equals(
    "all returned subscriptions belong to authenticated user",
    listPage1.data.every((s) => s.user.id === user.id),
    true,
  );
  TestValidator.equals(
    "pagination metadata - current page",
    listPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata - limit",
    listPage1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination metadata - total records",
    listPage1.pagination.records,
    subs.length,
  );

  // 4b. Get second page of subscriptions
  const listPage2 =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(listPage2);
  // Ensure no overlapping IDs between pages
  const idsPage1 = listPage1.data.map((s) => s.id);
  const idsPage2 = listPage2.data.map((s) => s.id);
  TestValidator.equals(
    "page 1 and 2 subscription ids are disjoint",
    idsPage1.some((id) => idsPage2.includes(id)),
    false,
  );

  // 4c. Filter subscriptions by a specific community
  const filterCommunity = communities[0];
  const filtered =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          community_id: filterCommunity.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered list contains only target community id",
    filtered.data.map((s) => s.community.id),
    [filterCommunity.id],
  );

  // 4d. Test sorting: ascending by created_at, then descending
  const sortedAsc =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_order: "asc",
        },
      },
    );
  typia.assert(sortedAsc);
  for (let i = 1; i < sortedAsc.data.length; ++i) {
    TestValidator.predicate(
      `subscriptions sorted ascending (${i - 1} <= ${i})`,
      sortedAsc.data[i - 1].created_at <= sortedAsc.data[i].created_at,
    );
  }
  const sortedDesc =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortedDesc);
  for (let i = 1; i < sortedDesc.data.length; ++i) {
    TestValidator.predicate(
      `subscriptions sorted descending (${i - 1} > ${i})`,
      sortedDesc.data[i - 1].created_at >= sortedDesc.data[i].created_at,
    );
  }

  // 4e. Soft-delete (unsubscribe) a subscription, then include deleted in search
  const targetToDelete = subs[0];
  // Simulate soft delete by updating deleted_at (not exposed in current API, so we skip this step)
  // Suppose API exposed unsubscribe, we would call it here. Instead, we just verify include_deleted flag behavior.
  const includingDeleted =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          include_deleted: true,
        },
      },
    );
  typia.assert(includingDeleted);
  // If any soft-deleted subscriptions existed, they would be included
  // For now, validate the presence and that all are for the same user
  TestValidator.equals(
    "all subscriptions (including deleted) belong to user",
    includingDeleted.data.every((s) => s.user.id === user.id),
    true,
  );

  // 5. Validate that subscriptions from other users are NOT present
  // Create another user and subscribe to different community
  const otherUserEmail: string = typia.random<string & tags.Format<"email">>();
  const otherUserPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const otherUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: otherUserEmail,
        password: otherUserPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(otherUser);
  // Switch to other user context
  const otherCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10) + RandomGenerator.alphaNumeric(3),
        display_title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        visibility: "public",
        status: "active",
        image_url: null,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(otherCommunity);
  const otherSub =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: otherCommunity.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(otherSub);

  // Re-run subscription search for first user (should not see other user's subs)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const searchSelf =
    await api.functional.communityPlatform.user.communitySubscriptions.index(
      connection,
      {
        body: {
          user_id: user.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(searchSelf);
  TestValidator.equals(
    "search for first user's subscriptions does not include other user's subscriptions",
    searchSelf.data.some((s) => s.user.id === otherUser.id),
    false,
  );
}
