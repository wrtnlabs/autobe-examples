import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAvatar";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_avatars_create } from "../../../generate/generate_random_reddit_community_member_avatars_create";
import { prepare_random_reddit_community_user_avatar } from "../../../prepare/prepare_random_reddit_community_user_avatar";

export async function test_api_member_avatar_history_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Upload multiple avatars at different times
  const avatar1 = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {
      body: {
        file: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityUserAvatar.ICreate,
    },
  );
  typia.assert(avatar1);
  // Wait to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const avatar2 = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {
      body: {
        file: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityUserAvatar.ICreate,
    },
  );
  typia.assert(avatar2);
  // Wait again for timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 100));
  const avatar3 = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {
      body: {
        file: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityUserAvatar.ICreate,
    },
  );
  typia.assert(avatar3);
  // 3. Get all avatars to establish baseline
  const allAvatars = await api.functional.redditCommunity.member.avatars.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityUserAvatar.IRequest,
    },
  );
  typia.assert(allAvatars);
  TestValidator.predicate(
    "has at least 3 avatars",
    allAvatars.data.length >= 3,
  );
  // 4. Test from_date filtering (avatars on or after specified date)
  const fromDateFilter =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          from_date: avatar2.created_at,
        } satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(fromDateFilter);
  TestValidator.predicate(
    "from_date filter returns avatars on or after date",
    fromDateFilter.data.every(
      (avatar) => avatar.createdAt >= avatar2.created_at,
    ),
  );
  TestValidator.predicate(
    "from_date pagination reflects filtered count",
    fromDateFilter.pagination.records === fromDateFilter.data.length,
  );
  // 5. Test to_date filtering (avatars on or before specified date)
  const toDateFilter =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          to_date: avatar2.created_at,
        } satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(toDateFilter);
  TestValidator.predicate(
    "to_date filter returns avatars on or before date",
    toDateFilter.data.every((avatar) => avatar.createdAt <= avatar2.created_at),
  );
  TestValidator.predicate(
    "to_date pagination reflects filtered count",
    toDateFilter.pagination.records === toDateFilter.data.length,
  );
  // 6. Test combined date range filtering (inclusive on both ends)
  const rangeFilter = await api.functional.redditCommunity.member.avatars.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        from_date: avatar1.created_at,
        to_date: avatar3.created_at,
      } satisfies IRedditCommunityUserAvatar.IRequest,
    },
  );
  typia.assert(rangeFilter);
  TestValidator.predicate(
    "range filter returns avatars within date range (inclusive)",
    rangeFilter.data.every(
      (avatar) =>
        avatar.createdAt >= avatar1.created_at &&
        avatar.createdAt <= avatar3.created_at,
    ),
  );
  TestValidator.predicate(
    "range pagination reflects filtered count",
    rangeFilter.pagination.records === rangeFilter.data.length,
  );
  // 7. Verify results are sorted by created_at descending
  TestValidator.predicate(
    "results sorted by created_at descending",
    rangeFilter.data.every((avatar, index, arr) => {
      if (index === 0) return true;
      return avatar.createdAt <= arr[index - 1].createdAt;
    }),
  );
  // 8. Test filtering with exact avatar timestamp (should include that avatar)
  const exactDateFilter =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          from_date: avatar2.created_at,
          to_date: avatar2.created_at,
        } satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(exactDateFilter);
  TestValidator.predicate(
    "exact date match returns avatars with matching timestamp",
    exactDateFilter.data.every(
      (avatar) => avatar.createdAt === avatar2.created_at,
    ),
  );
  // 9. Test empty result with impossible date range (far past)
  const pastDate = new Date("2000-01-01T00:00:00.000Z").toISOString();
  const emptyFilter = await api.functional.redditCommunity.member.avatars.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        from_date: pastDate,
        to_date: pastDate,
      } satisfies IRedditCommunityUserAvatar.IRequest,
    },
  );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "impossible date range returns empty results",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination shows 0 records",
    emptyFilter.pagination.records,
    0,
  );
}
