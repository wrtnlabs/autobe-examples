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

export async function test_api_community_icon_upload_by_owner(
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
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new community (member becomes owner automatically)
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify community was created with correct owner
  TestValidator.equals(
    "community owner is member",
    community.owner.id,
    memberAuth.id,
  );
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.predicate(
    "community has no icon initially",
    community.communityIcons.length === 0,
  );
  // 3. Upload an icon image to the community
  const iconUri = typia.random<string & tags.Format<"uri">>();
  const communityWithIcon =
    await generate_random_reddit_community_member_communities_icon_create(
      memberConnection,
      {
        body: {
          uri: iconUri,
        } satisfies IRedditCommunityCommunityIcon.ICreate,
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(communityWithIcon);
  // 4. Verify the response contains the complete community entity with icon
  TestValidator.equals(
    "community id unchanged",
    communityWithIcon.id,
    community.id,
  );
  TestValidator.equals(
    "community name unchanged",
    communityWithIcon.name,
    community.name,
  );
  TestValidator.predicate(
    "community has icon after upload",
    communityWithIcon.communityIcons.length > 0,
  );
  // 5. Validate icon metadata is properly populated
  const icon = communityWithIcon.communityIcons[0]!;
  typia.assert(icon);
  TestValidator.predicate("icon has storageKey", icon.storageKey.length > 0);
  TestValidator.predicate(
    "icon has originalFilename",
    icon.originalFilename.length > 0,
  );
  TestValidator.predicate("icon has mimeType", icon.mimeType.length > 0);
  TestValidator.predicate("icon has fileSize", icon.fileSize > 0);
  TestValidator.predicate("icon has createdAt", icon.createdAt.length > 0);
  TestValidator.predicate("icon has updatedAt", icon.updatedAt.length > 0);
  TestValidator.equals("icon deletedAt is null", icon.deletedAt, null);
  // Validate nullable width and height (can be null if dimensions not extracted)
  if (icon.width !== null) {
    TestValidator.predicate("icon width is positive", icon.width > 0);
  }
  if (icon.height !== null) {
    TestValidator.predicate("icon height is positive", icon.height > 0);
  }
  // 6. Confirm community's icon relationship correctly references the uploaded icon
  TestValidator.equals(
    "icon community id matches",
    icon.community.id,
    community.id,
  );
  TestValidator.equals(
    "icon community name matches",
    icon.community.name,
    communityName,
  );
}
