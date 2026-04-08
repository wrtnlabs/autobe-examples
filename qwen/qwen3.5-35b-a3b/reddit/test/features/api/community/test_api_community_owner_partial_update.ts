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

export async function test_api_community_owner_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register member account as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(owner);
  // 2. Create community with initial description and icon_url
  const initialName =
    RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3);
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialIconUrl = "https://example.com/icons/community-icon.png";
  const initialCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          icon_url: initialIconUrl,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);
  // Record initial state
  const initialUpdatedAt = initialCommunity.updated_at;
  typia.assert(initialCommunity.description);
  typia.assert(initialCommunity.icon_url);
  // 3. Update with only description (icon_url omitted)
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdate =
    await api.functional.redditPlatform.member.communities.update(
      ownerConnection,
      {
        name: initialCommunity.name,
        body: {
          description: updatedDescription,
          // icon_url omitted
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Verify icon_url is preserved, description is updated
  TestValidator.equals(
    "icon_url preserved after description update",
    firstUpdate.icon_url,
    initialCommunity.icon_url,
  );
  TestValidator.equals(
    "description updated",
    firstUpdate.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "updated_at changed after description update",
    initialUpdatedAt,
    firstUpdate.updated_at,
  );
  // 4. Update with only icon_url (description omitted)
  const updatedIconUrl = "https://example.com/icons/new-community-icon.jpg";
  const secondUpdate =
    await api.functional.redditPlatform.member.communities.update(
      ownerConnection,
      {
        name: initialCommunity.name,
        body: {
          // description omitted
          icon_url: updatedIconUrl,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Verify description is preserved, icon_url is updated
  TestValidator.equals(
    "description preserved after icon_url update",
    secondUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon_url updated",
    secondUpdate.icon_url,
    updatedIconUrl,
  );
  TestValidator.notEquals(
    "updated_at changed after icon_url update",
    firstUpdate.updated_at,
    secondUpdate.updated_at,
  );
  // 5. Update with null description (explicit clear)
  const thirdUpdate =
    await api.functional.redditPlatform.member.communities.update(
      ownerConnection,
      {
        name: initialCommunity.name,
        body: {
          description: null,
          // icon_url omitted
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  // Verify description is cleared
  TestValidator.equals(
    "description cleared with null",
    thirdUpdate.description,
    null,
  );
  TestValidator.equals(
    "icon_url still preserved",
    thirdUpdate.icon_url,
    updatedIconUrl,
  );
  TestValidator.notEquals(
    "updated_at changed after null description update",
    secondUpdate.updated_at,
    thirdUpdate.updated_at,
  );
  // 6. Update with null icon_url (explicit clear)
  const fourthUpdate =
    await api.functional.redditPlatform.member.communities.update(
      ownerConnection,
      {
        name: initialCommunity.name,
        body: {
          // description omitted (remains null)
          icon_url: null,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(fourthUpdate);
  // Verify icon_url is cleared, description remains null
  TestValidator.equals(
    "icon_url cleared with null",
    fourthUpdate.icon_url,
    null,
  );
  TestValidator.equals(
    "description remains null",
    fourthUpdate.description,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed after null icon_url update",
    thirdUpdate.updated_at,
    fourthUpdate.updated_at,
  );
  // 7. Verify immutable fields remained unchanged throughout all updates
  TestValidator.equals(
    "name unchanged",
    fourthUpdate.name,
    initialCommunity.name,
  );
  TestValidator.equals(
    "owner unchanged",
    fourthUpdate.owner.id,
    initialCommunity.owner.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    fourthUpdate.created_at,
    initialCommunity.created_at,
  );
}
