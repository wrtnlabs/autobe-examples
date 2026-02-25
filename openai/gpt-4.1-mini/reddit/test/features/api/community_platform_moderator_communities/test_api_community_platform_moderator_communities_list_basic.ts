import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_communities_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // 1. Attempt to request the communities list without authentication and expect failure.
  // 2. Register a new moderator and authenticate.
  // 3. Use the authenticated moderator connection to request the full paginated list of communities without filters.
  // 4. Validate pagination metadata correctness.
  // 5. Validate each community summary includes all required fields and nested ownerUser summary.
  // 1. Create unauthenticated connection for negative test
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Expect unauthorized error when accessing the endpoint without auth
  await TestValidator.httpError(
    "unauthenticated request denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communities.index(
        unauthenticatedConnection,
        {
          body: {}, // No filters
        },
      );
    },
  );
  // 2. Moderator registration and authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    displayName: null,
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Update headers for authorized connection
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 3. Request full paginated list of communities without filters
  const response =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      {
        body: {}, // No filters: page default, limit default, no sort
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  // current page >= 1; limit >= 0; records >= 0; pages >= 0
  TestValidator.predicate(
    "pagination current page minimum 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate each community summary
  for (const community of response.data) {
    typia.assertGuard(community);
    TestValidator.predicate(
      "community id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community name is non-empty",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community description is string",
      typeof community.description === "string",
    );
    TestValidator.predicate(
      "community iconUrl is string",
      typeof community.iconUrl === "string",
    );
    TestValidator.predicate(
      "community subscriberCount is non-negative int",
      community.subscriberCount >= 0,
    );
    // Validate ownerUser summary
    const owner = community.ownerUser;
    typia.assertGuard(owner);
    TestValidator.predicate(
      "ownerUser id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        owner.id,
      ),
    );
    TestValidator.predicate(
      "ownerUser email contains @",
      owner.email.includes("@"),
    );
    TestValidator.predicate(
      "ownerUser username is non-empty",
      owner.username.length > 0,
    );
    TestValidator.predicate(
      "ownerUser displayName is string",
      typeof owner.displayName === "string",
    );
    TestValidator.predicate(
      "ownerUser karma is non-negative",
      owner.karma >= 0,
    );
    // Check timestamps format for community
    TestValidator.predicate(
      "community createdAt is valid date-time",
      !isNaN(Date.parse(community.createdAt)),
    );
    TestValidator.predicate(
      "community updatedAt is valid date-time",
      !isNaN(Date.parse(community.updatedAt)),
    );
    if (community.deletedAt !== null) {
      TestValidator.predicate(
        "community deletedAt is valid date-time if not null",
        !isNaN(Date.parse(community.deletedAt)),
      );
    }
    // Check timestamps format for ownerUser
    TestValidator.predicate(
      "ownerUser createdAt is valid date-time",
      !isNaN(Date.parse(owner.createdAt)),
    );
    TestValidator.predicate(
      "ownerUser updatedAt is valid date-time",
      !isNaN(Date.parse(owner.updatedAt)),
    );
    if (owner.deletedAt !== null) {
      TestValidator.predicate(
        "ownerUser deletedAt is valid date-time if not null",
        !isNaN(Date.parse(owner.deletedAt)),
      );
    }
  }
}
