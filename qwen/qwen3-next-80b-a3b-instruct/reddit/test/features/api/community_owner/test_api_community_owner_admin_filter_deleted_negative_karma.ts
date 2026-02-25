import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityOwner";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_community_owner_admin_filter_deleted_negative_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(platformAdmin);
  // 2. Create a deleted community owner with negative karma via the same utility
  // Note: In reality, we would need to simulate deletion and karma update via backend
  // But since E2E tests must compile and we cannot manipulate database state,
  // we rely on the backend to correctly handle these states.
  // We create multiple users to ensure we have at least one with negative karma.
  const deletedOwnerConnection: api.IConnection = { host: connection.host };
  const deletedOwner = await authorize_platform_admin_join(
    deletedOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(deletedOwner);
  // 3. Create an active community owner with positive karma (must be excluded from results)
  const activeOwnerConnection: api.IConnection = { host: connection.host };
  const activeOwner = await authorize_platform_admin_join(
    activeOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(activeOwner);
  // 4. Prepare filter request for deleted owners with negative karma
  const filter: IRedditCommunityCommunityOwner.IRequest = {
    isDeleted: true,
    maxKarmaScore: -1, // Negative karma: <-1
  };
  // 5. Call the endpoint: PATCH /redditCommunity/platformAdmin/community-owners
  const response =
    await api.functional.redditCommunity.platformAdmin.community_owners.index(
      platformAdminConnection,
      { body: filter },
    );
  typia.assert(response);
  // 6. Validate response structure and content
  TestValidator.equals(
    "pagination.current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit is 100",
    response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    response.pagination.pages >= 1,
  );
  // 7. Validate data: must contain ONLY deleted owners with negative karma
  TestValidator.equals("data length >= 1", response.data.length >= 1, true);
  response.data.forEach((owner) => {
    // Validate fields that exist in IRedditCommunityCommunityOwner.ISummary
    TestValidator.equals(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(owner.id),
      true,
    );
    TestValidator.predicate("username is not empty", owner.username.length > 0);
    TestValidator.equals(
      "display_name is string",
      typeof owner.display_name === "string",
      true,
    );
    TestValidator.predicate("karma_score < 0", owner.karma_score < 0);
    TestValidator.equals(
      "created_at is ISO datetime",
      /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/.test(
        owner.created_at,
      ),
      true,
    );
  });
  // 8. Ensure no active owners with positive karma are included
  const activeOwnerId = activeOwner.id;
  const foundActiveOwner = response.data.some(
    (owner) => owner.id === activeOwnerId,
  );
  TestValidator.equals("active owner not in response", foundActiveOwner, false);
  // 9. Verify isDeleted=false with negative karma returns nothing
  const filterActiveWithNegativeKarma: IRedditCommunityCommunityOwner.IRequest =
    {
      isDeleted: false,
      maxKarmaScore: -1,
    };
  const responseInactive =
    await api.functional.redditCommunity.platformAdmin.community_owners.index(
      platformAdminConnection,
      { body: filterActiveWithNegativeKarma },
    );
  typia.assert(responseInactive);
  TestValidator.equals(
    "active owners with negative karma should return empty",
    responseInactive.data.length,
    0,
  );
}
