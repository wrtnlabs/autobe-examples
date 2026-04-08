import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_owner_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account that will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(auth);
  // 2. Create new community with owner as authenticated member
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = { Authorization: auth.token.access };
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(8);
  const initialDescription = "Initial community description";
  const initialIconUrl = "https://example.com/initial-icon.png";
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: initialDescription,
          icon_url: initialIconUrl,
        },
      },
    );
  typia.assert(community);
  // 3. Capture initial state for validation
  const initialCreatedAt = community.created_at;
  const initialUpdatedAt = community.updated_at;
  const initialOwner = community.owner;
  const initialDescriptionValue = community.description;
  const initialIconUrlValue = community.icon_url;
  // 4. Update community metadata
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = { Authorization: auth.token.access };
  const newDescription = "Updated community description for testing";
  const newIconUrl = "https://example.com/updated-icon.png";
  const updatedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.update(
      updateConnection,
      {
        name: communityName,
        body: {
          description: newDescription,
          icon_url: newIconUrl,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validate response
  // 5.1. Verify 200 OK response (implicit - if we got here, request succeeded)
  // 5.2. Verify updated fields reflect request
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    newDescription,
  );
  TestValidator.equals(
    "icon_url updated",
    updatedCommunity.icon_url,
    newIconUrl,
  );
  // 5.3. Verify name remains unchanged (immutable)
  TestValidator.equals("name unchanged", updatedCommunity.name, communityName);
  // 5.4. Verify owner field is still the requesting user
  TestValidator.equals("owner unchanged", updatedCommunity.owner.id, auth.id);
  TestValidator.equals(
    "owner username unchanged",
    updatedCommunity.owner.username,
    auth.username,
  );
  // 5.5. Verify created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    initialCreatedAt,
  );
  // 5.6. Verify updated_at timestamp reflects the change time (should be later)
  TestValidator.predicate(
    "updated_at reflects change",
    new Date(updatedCommunity.updated_at) > new Date(initialUpdatedAt),
  );
  // 5.7. Verify description validation (max 500 characters)
  if (
    updatedCommunity.description !== null &&
    updatedCommunity.description !== undefined
  ) {
    TestValidator.predicate(
      "description within 500 char limit",
      updatedCommunity.description.length <= 500,
    );
  }
  // 5.8. Verify icon_url validation (valid URI if provided)
  if (
    updatedCommunity.icon_url !== null &&
    updatedCommunity.icon_url !== undefined
  ) {
    try {
      new URL(updatedCommunity.icon_url);
    } catch {
      throw new Error("icon_url is not a valid URI");
    }
  }
}