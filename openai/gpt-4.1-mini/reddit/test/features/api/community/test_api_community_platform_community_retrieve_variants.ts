import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_platform_community_retrieve_variants(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve community details by ID as authenticated user
  {
    // Authenticate user by joining
    const userConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_user_join(connection, {});
    userConnection.headers = { Authorization: authorized.token.access };
    // Create community as authenticated user
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {},
      );
    // Retrieve community by ID with authentication
    const communityGot =
      await api.functional.communityPlatform.user.communities.at(
        userConnection,
        { communityId: community.id },
      );
    typia.assert(communityGot);
    // Validate response fields
    TestValidator.equals("community id matches", communityGot.id, community.id);
    TestValidator.equals(
      "community name matches",
      communityGot.name,
      community.name,
    );
    TestValidator.equals(
      "community description matches",
      communityGot.description,
      community.description,
    );
    TestValidator.equals(
      "community iconUrl matches",
      communityGot.iconUrl,
      community.iconUrl,
    );
    TestValidator.equals(
      "community deletedAt is null",
      communityGot.deletedAt,
      null,
    );
    TestValidator.predicate(
      "community createdAt is valid date",
      !isNaN(Date.parse(communityGot.createdAt)),
    );
    TestValidator.predicate(
      "community updatedAt is valid date",
      !isNaN(Date.parse(communityGot.updatedAt)),
    );
    TestValidator.predicate(
      "community subscriberCount is boolean",
      typeof communityGot.subscriberCount === "boolean",
    );
    // Validate ownerUser fields
    const owner = communityGot.ownerUser;
    typia.assert(owner);
    TestValidator.predicate(
      "ownerUser id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        owner.id,
      ),
    );
    TestValidator.predicate(
      "ownerUser email is string",
      typeof owner.email === "string",
    );
    TestValidator.predicate(
      "ownerUser username is string",
      typeof owner.username === "string",
    );
    TestValidator.predicate(
      "ownerUser displayName is string",
      typeof owner.displayName === "string",
    );
    TestValidator.predicate(
      "ownerUser karma is number",
      typeof owner.karma === "number",
    );
    TestValidator.equals("ownerUser deletedAt is null", owner.deletedAt, null);
    // bio and avatarUrl may be undefined or null or string
    TestValidator.predicate(
      "ownerUser bio is string or null or undefined",
      owner.bio === null ||
        owner.bio === undefined ||
        typeof owner.bio === "string",
    );
    TestValidator.predicate(
      "ownerUser avatarUrl is string or null or undefined",
      owner.avatarUrl === null ||
        owner.avatarUrl === undefined ||
        typeof owner.avatarUrl === "string",
    );
  }
  // Scenario 2: Retrieve community details by ID as guest (no authentication)
  {
    // Authenticate user by joining and create community
    const authConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_user_join(connection, {});
    authConnection.headers = { Authorization: authorized.token.access };
    const community =
      await generate_random_community_platform_user_communities_create(
        authConnection,
        {},
      );
    // Retrieve community detail without authentication
    const guestConnection: api.IConnection = { host: connection.host };
    const communityGot =
      await api.functional.communityPlatform.user.communities.at(
        guestConnection,
        { communityId: community.id },
      );
    typia.assert(communityGot);
    // Validate minimal fields
    TestValidator.equals("community id matches", communityGot.id, community.id);
    TestValidator.equals(
      "community name matches",
      communityGot.name,
      community.name,
    );
    TestValidator.equals(
      "community description matches",
      communityGot.description,
      community.description,
    );
    TestValidator.equals(
      "community iconUrl matches",
      communityGot.iconUrl,
      community.iconUrl,
    );
    TestValidator.equals(
      "community deletedAt is null",
      communityGot.deletedAt,
      null,
    );
    TestValidator.predicate(
      "community createdAt is valid date",
      !isNaN(Date.parse(communityGot.createdAt)),
    );
    TestValidator.predicate(
      "community updatedAt is valid date",
      !isNaN(Date.parse(communityGot.updatedAt)),
    );
    TestValidator.predicate(
      "community subscriberCount is boolean",
      typeof communityGot.subscriberCount === "boolean",
    );
    // Validate owner user summary
    const owner = communityGot.ownerUser;
    typia.assert(owner);
    TestValidator.predicate(
      "ownerUser id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        owner.id,
      ),
    );
    TestValidator.predicate(
      "ownerUser email is string",
      typeof owner.email === "string",
    );
    TestValidator.predicate(
      "ownerUser username is string",
      typeof owner.username === "string",
    );
    TestValidator.predicate(
      "ownerUser displayName is string",
      typeof owner.displayName === "string",
    );
    TestValidator.predicate(
      "ownerUser karma is number",
      typeof owner.karma === "number",
    );
    TestValidator.equals("ownerUser deletedAt is null", owner.deletedAt, null);
    TestValidator.predicate(
      "ownerUser bio is string or null or undefined",
      owner.bio === null ||
        owner.bio === undefined ||
        typeof owner.bio === "string",
    );
    TestValidator.predicate(
      "ownerUser avatarUrl is string or null or undefined",
      owner.avatarUrl === null ||
        owner.avatarUrl === undefined ||
        typeof owner.avatarUrl === "string",
    );
  }
  // Scenario 3: Fail to retrieve community details for a random non-existent community ID
  {
    // Authenticate user
    const userConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_user_join(connection, {});
    userConnection.headers = { Authorization: authorized.token.access };
    // Generate invalid random UUID
    const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
    // Expect 404 error when trying to retrieve non-existent community
    await TestValidator.httpError(
      "non-existent community id returns 404",
      404,
      async () => {
        await api.functional.communityPlatform.user.communities.at(
          userConnection,
          {
            communityId: invalidCommunityId,
          },
        );
      },
    );
  }
}
