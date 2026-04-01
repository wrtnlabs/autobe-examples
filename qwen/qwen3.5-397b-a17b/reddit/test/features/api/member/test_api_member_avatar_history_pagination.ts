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

export async function test_api_member_avatar_history_pagination(
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
  // 2. Upload multiple avatar images for pagination testing
  const avatarCount = 5;
  const uploadedAvatars: IRedditCommunityUserAvatar[] = [];
  for (let i = 0; i < avatarCount; i++) {
    const avatar = await generate_random_reddit_community_member_avatars_create(
      memberConnection,
      {
        body: {
          file: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityUserAvatar.ICreate,
      },
    );
    typia.assert(avatar);
    uploadedAvatars.push(avatar);
  }
  // 3. Test with default pagination (page 1, limit 20)
  const defaultPagination =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(defaultPagination);
  // Validate pagination metadata
  TestValidator.equals(
    "default pagination current page",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination total records",
    defaultPagination.pagination.records,
    avatarCount,
  );
  TestValidator.predicate(
    "default pagination pages calculated correctly",
    defaultPagination.pagination.pages >= 1,
  );
  // Validate all uploaded avatars are returned
  TestValidator.equals(
    "all avatars returned in default pagination",
    defaultPagination.data.length,
    avatarCount,
  );
  // Validate avatars are sorted by created_at descending (newest first)
  for (let i = 1; i < defaultPagination.data.length; i++) {
    const prevDate = new Date(
      defaultPagination.data[i - 1].createdAt,
    ).getTime();
    const currDate = new Date(defaultPagination.data[i].createdAt).getTime();
    TestValidator.predicate(
      `avatar ${i} is older than avatar ${i - 1}`,
      prevDate >= currDate,
    );
  }
  // 4. Test with custom pagination (page 1, limit 2)
  const customPagination =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom pagination current page",
    customPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit",
    customPagination.pagination.limit,
    2,
  );
  TestValidator.equals(
    "custom pagination total records",
    customPagination.pagination.records,
    avatarCount,
  );
  TestValidator.equals(
    "custom pagination pages",
    customPagination.pagination.pages,
    Math.ceil(avatarCount / 2),
  );
  TestValidator.equals(
    "custom pagination data length",
    customPagination.data.length,
    2,
  );
  // 5. Test pagination page 2 with limit 2
  const page2Pagination =
    await api.functional.redditCommunity.member.avatars.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditCommunityUserAvatar.IRequest,
      },
    );
  typia.assert(page2Pagination);
  TestValidator.equals(
    "page 2 current page",
    page2Pagination.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has remaining items",
    page2Pagination.data.length > 0,
  );
  TestValidator.predicate(
    "page 2 has at most limit items",
    page2Pagination.data.length <= 2,
  );
  // 6. Verify all pages combined return all avatars
  const allPagesData: IRedditCommunityUserAvatar.ISummary[] = [
    ...customPagination.data,
    ...page2Pagination.data,
  ];
  TestValidator.equals(
    "all pages combined equal total records",
    allPagesData.length,
    avatarCount,
  );
  // Verify no duplicate avatars across pages
  const uniqueIds = new Set(allPagesData.map((a) => a.id));
  TestValidator.equals(
    "no duplicate avatars across pages",
    uniqueIds.size,
    allPagesData.length,
  );
}
