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

export async function test_api_community_update_successful_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Helper function to generate a random community name
  function initialCommunityName(): string {
    return `community_${RandomGenerator.alphabets(8)}`;
  }
  // 1. Create and authenticate a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a community with initial details
  const initialName = initialCommunityName();
  const initialCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: initialName,
          description: "Initial description",
          iconUrl: "https://example.com/initial.png",
        },
      },
    );
  typia.assert(initialCommunity);
  // 3. Prepare update data: new unique name, description, icon_url
  const updatedName = `updated_${initialCommunity.name}`;
  const updateBody: ICommunityPlatformCommunity.IUpdate = {
    name: updatedName,
    description: "Updated community description.",
    icon_url: "https://example.com/updated.png",
  };
  // 4. Update community details by owner
  const updatedCommunity =
    await api.functional.communityPlatform.user.communities.updateCommunity(
      userConnection,
      {
        communityId: initialCommunity.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);
  typia.assert(updatedCommunity.ownerUser);
  // 5. Verify updated fields
  TestValidator.equals("updated name", updatedCommunity.name, updateBody.name);
  TestValidator.equals(
    "updated description",
    updatedCommunity.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated iconUrl",
    updatedCommunity.iconUrl,
    updateBody.icon_url,
  );
  // 6. Verify ownerUser details
  TestValidator.equals(
    "owner user id",
    updatedCommunity.ownerUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "owner user email",
    updatedCommunity.ownerUser.email,
    authorizedUser.email,
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "createdAt is iso date",
    typeof updatedCommunity.createdAt === "string" &&
      updatedCommunity.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is iso date",
    typeof updatedCommunity.updatedAt === "string" &&
      updatedCommunity.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is later or equal to createdAt",
    updatedCommunity.updatedAt >= updatedCommunity.createdAt,
  );
  TestValidator.equals("deletedAt is null", updatedCommunity.deletedAt, null);
}
