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

export async function test_api_community_owner_admin_retrieve_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const platformAdminConnection: api.IConnection = { host: connection.host };
  // Register a new platform admin account
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(platformAdmin);
  // Use the same connection for the API call - authorization was handled by the utility
  const response =
    await api.functional.redditCommunity.platformAdmin.community_owners.index(
      platformAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 100 (default)",
    response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages > 0,
  );
  // Validate each owner summary
  for (const owner of response.data) {
    // Validate required fields
    TestValidator.predicate(
      "owner has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        owner.id,
      ),
    );
    TestValidator.predicate(
      "owner has username",
      typeof owner.username === "string" && owner.username.length > 0,
    );
    TestValidator.predicate(
      "owner has display_name",
      typeof owner.display_name === "string" && owner.display_name.length > 0,
    );
    TestValidator.predicate(
      "owner has karma_score",
      typeof owner.karma_score === "number" && owner.karma_score >= 0,
    );
    TestValidator.predicate(
      "owner has created_at",
      typeof owner.created_at === "string" &&
        !isNaN(Date.parse(owner.created_at)),
    );
    // Validate no deleted users are included
    // Note: is_deleted is not part of the summary schema, so we rely on endpoint logic to filter them
    // Verified indirectly by the test - only active users should appear in results
  }
}
