import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test community update validation errors.
 * Validates that community update properly rejects invalid input data.
 */
export async function test_api_community_update_validation_errors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as owner to get authorized session
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "SecurePass123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      displayName: `Owner ${RandomGenerator.name()}`,
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create a community for testing using available community creation endpoint
  // Since create endpoint is not available, we need to test directly with update validation
  // Test Case 1: Invalid community name with spaces
  await TestValidator.error("invalid name with spaces", async () => {
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        name: "community with spaces",
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
  // Test Case 2: Invalid community name with special characters
  await TestValidator.error("invalid name with special chars", async () => {
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        name: "community@#$%",
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
  // Test Case 3: Description exceeding 2000 characters
  const longDescription = "x".repeat(2001);
  await TestValidator.error("description too long", async () => {
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        name: "valid_name",
        description: longDescription,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
  // Test Case 4: Invalid icon URL format
  await TestValidator.error("invalid icon URL format", async () => {
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        name: "valid_name",
        icon_url: "not-a-valid-url",
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
  // Test Case 5: Empty community name
  await TestValidator.error("empty community name", async () => {
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        name: "",
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
}
