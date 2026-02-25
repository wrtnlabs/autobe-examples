import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test browsing communities with default pagination and sorting. Validate the
 * response includes paginated community summaries with correct fields including
 * name, description, icon, and subscriberCount. Verify that without any filter or
 * search, the system returns a valid page of communities and handles pagination
 * metadata properly.
 */
export async function test_api_community_browsing_default_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      username: RandomGenerator.name(1),
      password: "test1234",
      displayName: RandomGenerator.name(1),
      href: "http://localhost/",
      referrer: "http://localhost/",
    },
  });
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // Step 2: Request communities listing via PATCH /communityPlatform/user/communities
  const response: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.user.communities.index(
      userConnection,
      {
        body: {}, // no filters, default pagination and sort
      },
    );
  typia.assert(response);
  // Step 3: Validate pagination info
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages count matches calculated value",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // Step 4: Validate each community summary in data array
  for (const community of data) {
    typia.assert(community);
    TestValidator.predicate(
      "community name non-empty",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community description non-empty",
      community.description.length > 0,
    );
    TestValidator.predicate(
      "community iconUrl non-empty",
      community.iconUrl.length > 0,
    );
    TestValidator.predicate(
      "community subscriberCount non-negative",
      community.subscriberCount >= 0,
    );
    // ownerUser details
    typia.assert(community.ownerUser);
    TestValidator.predicate(
      "ownerUser id non-empty",
      community.ownerUser.id.length === 36,
    );
    TestValidator.predicate(
      "ownerUser email contains @",
      community.ownerUser.email.includes("@"),
    );
    TestValidator.predicate(
      "ownerUser username non-empty",
      community.ownerUser.username.length > 0,
    );
    TestValidator.predicate(
      "ownerUser displayName non-empty",
      community.ownerUser.displayName.length > 0,
    );
    TestValidator.predicate(
      "ownerUser karma is integer >= 0",
      Number.isInteger(community.ownerUser.karma) &&
        community.ownerUser.karma >= 0,
    );
  }
}
