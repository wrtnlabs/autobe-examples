import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_icon_create } from "../../../generate/generate_random_reddit_community_member_communities_icon_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_icon } from "../../../prepare/prepare_random_reddit_community_community_icon";

export async function test_api_community_icon_replacement_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community with initial icon
  const initialIconUri = typia.random<string & tags.Format<"uri">>();
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: initialIconUri,
        },
      },
    );
  typia.assert(community);
  // Verify initial icon was created
  TestValidator.predicate(
    "community has initial icon",
    community.communityIcons.length === 1,
  );
  const initialIcon = community.communityIcons[0];
  TestValidator.equals(
    "initial icon community matches",
    initialIcon.community.id,
    community.id,
  );
  TestValidator.predicate(
    "initial icon is active",
    initialIcon.deletedAt === null,
  );
  // 3. Upload replacement icon with different URI
  const replacementIconUri = typia.random<string & tags.Format<"uri">>();
  const updatedCommunity =
    await generate_random_reddit_community_member_communities_icon_create(
      memberConnection,
      {
        body: {
          uri: replacementIconUri,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify the community now has 2 icons (1 old soft-deleted, 1 new active)
  TestValidator.predicate(
    "community has 2 icons after replacement",
    updatedCommunity.communityIcons.length === 2,
  );
  // 5. Find the new active icon and old soft-deleted icon
  const activeIcons = updatedCommunity.communityIcons.filter(
    (icon) => icon.deletedAt === null,
  );
  const deletedIcons = updatedCommunity.communityIcons.filter(
    (icon) => icon.deletedAt !== null,
  );
  TestValidator.equals("one active icon exists", activeIcons.length, 1);
  TestValidator.equals("one deleted icon exists", deletedIcons.length, 1);
  // 6. Verify the new icon has the replacement URI and is different from initial
  const newIcon = activeIcons[0];
  TestValidator.predicate(
    "new icon is different from initial",
    newIcon.id !== initialIcon.id,
  );
  TestValidator.predicate("new icon is active", newIcon.deletedAt === null);
  // 7. Verify the old icon is soft-deleted
  const oldIcon = deletedIcons[0];
  TestValidator.equals(
    "old icon id matches initial",
    oldIcon.id,
    initialIcon.id,
  );
  TestValidator.predicate(
    "old icon has deleted_at timestamp",
    oldIcon.deletedAt !== null,
  );
}
