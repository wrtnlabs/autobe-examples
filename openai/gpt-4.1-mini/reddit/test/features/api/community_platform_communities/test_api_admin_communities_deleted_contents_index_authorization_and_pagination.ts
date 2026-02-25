import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_communities_deleted_contents_index_authorization_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of deleted contents by authorized admin
  // 1. Create community by user
  const userConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icon-${RandomGenerator.alphabets(5)}.png`,
        },
      },
    );
  typia.assert(community);
  // 2. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 3. Use adminConnection with admin token
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 4. Call PATCH /communityPlatform/admin/communities/{communityId}/deleted-contents
  const deletedContents =
    await api.functional.communityPlatform.admin.communities.deleted_contents.index(
      adminConnection,
      { communityId: community.id },
    );
  typia.assert(deletedContents);
  // 5. Validate pagination metadata
  const { pagination, data } = deletedContents;
  typia.assert(pagination);
  typia.assert(data);
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 6. Validate each deleted content record
  let previousCreatedAt: string | null = null;
  for (const record of data) {
    typia.assert(record);
    TestValidator.predicate(
      "deleted content has moderator",
      record.moderator !== null && record.moderator !== undefined,
    );
    TestValidator.predicate(
      "deleted content has user",
      record.user !== null && record.user !== undefined,
    );
    TestValidator.predicate(
      "deleted content has reason",
      typeof record.reason === "string" && record.reason.length > 0,
    );
    TestValidator.predicate(
      "deleted content has createdAt",
      typeof record.createdAt === "string",
    );
    TestValidator.predicate(
      "deleted content has updatedAt",
      typeof record.updatedAt === "string",
    );
    TestValidator.predicate(
      "deleted content reason is non-empty",
      record.reason.length > 0,
    );
    TestValidator.predicate(
      "deleted content has moderatorId",
      typeof record.moderatorId === "string",
    );
    TestValidator.predicate(
      "deleted content has userId",
      typeof record.userId === "string",
    );
    TestValidator.predicate(
      "deleted content has either postId or commentId",
      record.postId !== null || record.commentId !== null,
    );
    if (previousCreatedAt !== null) {
      TestValidator.predicate(
        "deleted contents are sorted by createdAt descending",
        previousCreatedAt >= record.createdAt,
      );
    }
    previousCreatedAt = record.createdAt;
  }
  // Scenario 2: Authorization failure for non-admin user
  // 1. Create another community by user
  const anotherCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(anotherCommunity);
  // 2. User join
  const userAuthorized = await authorize_user_join(userConnection, {});
  typia.assert(userAuthorized);
  // 3. Set user token to userConnection
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 4. Call PATCH /communityPlatform/admin/communities/{communityId}/deleted-contents - expect forbidden error
  await TestValidator.httpError(
    "non-admin user forbidden to access deleted contents",
    403,
    async () => {
      await api.functional.communityPlatform.admin.communities.deleted_contents.index(
        userConnection,
        { communityId: anotherCommunity.id },
      );
    },
  );
}
